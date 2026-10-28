"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { META_SIZE_CLASSES } from "@/components/FontSizeToggle";
import QuestionField, {
  chunkQuestions,
  isQuestionAnswered,
  type LocalAnswer,
  SELECTABLE_TYPES,
  TEXTAREA_DEFAULT_MAX_LENGTH,
} from "@/components/QuestionField";
import { TalentFullscreenOverlays, useTalentFullscreen } from "@/components/TalentFullscreen";
import {
  TalentCard,
  TalentCompletedScreen,
  TalentPrimaryButton,
  TalentSecondaryButton,
  TalentStatusScreen,
} from "@/components/TalentScreens";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import {
  checkRecruitmentToken,
  getCustomQuestions,
  getTestQuestions,
  submitCustomQuestionAnswers,
  submitTest,
} from "@/lib/api/recruitment";
import type { QuestionAnswerRequest, RecruitmentTestInfo, TestSubmission } from "@/lib/api/recruitment-types";
import type { AnswerChoice, QuestionWithRule } from "@/lib/api/types";
import { getTalentErrorMessage, isTokenExpiredError } from "@/lib/error-messages";
import { useFontSize } from "@/lib/font-size-context";
import { manrope } from "@/lib/fonts";
import { TALENT_TEXT } from "@/lib/helptext";
import {
  clearTalentProgress,
  clearTalentSession,
  isTalentCompleted,
  loadTalentProgress,
  loadTalentState,
  markTalentCompleted,
  saveTalentProgress,
  saveTalentState,
  type TalentState,
} from "@/lib/recruitment-session";
import { resolveSurveyTheme, surveyThemeCssVars } from "@/lib/survey-theme";
import { useBrowserEventTracker, useQuestionEngagement } from "@/lib/talent-tracking";

// Талент үнэлгээний явц: тест бүрд (intro карт → асуултууд → илгээх), дараа нь
// ажил олгогчийн нэмэлт асуултууд (байвал), эцэст нь "Амжилттай дууслаа".
// Дуудлагын дараалал/token-ууд бодит frontend-тэй ижил:
//   - Тест эхлүүлэх бүрд check-token (RecruitmentDTO.authorization)
//   - qn/{sessionId} + { str: testId } → TestQuestions (id + өөрийн authorization)
//   - qn/submit-ийг TestQuestions.authorization-оор, TestSubmission.id = TestQuestions.id
//   - cq/{sessionId} → CustomQuestionSection, cq/submit-ийг түүний authorization-оор
// Аль тест илгээгдсэнийг localStorage-д (TalentState.submittedTestIds) хадгална
// — refresh/tab хаасны дараа зогссон тестээсээ үргэлжилнэ.

const AUTO_ADVANCE_DELAY_MS = 350;

type Stage = { kind: "test"; index: number; test: RecruitmentTestInfo } | { kind: "custom" } | { kind: "done" };

interface LoadedSection {
  stageKey: string;
  // TestQuestions.id / CustomQuestionSection.id — submit-ийн TestSubmission.id
  // болон BrowserEvent.testAnswerId.
  id: string;
  // Submit-д ашиглах token (TestQuestions/CustomQuestionSection.authorization).
  authorization: string;
  pageSize: number;
  questions: QuestionWithRule[];
  // Асуулт ачаалагдсан мөч — staging-ийн totalTimeTaken (секунд) нь бодит
  // frontend-тэй адил эндээс submit хүртэлх хугацаа.
  loadedAt: number;
}

function currentStage(state: TalentState): Stage {
  const tests = state.info.tests ?? [];
  const index = tests.findIndex((test) => !state.submittedTestIds.includes(test.id));
  if (index !== -1) return { kind: "test", index, test: tests[index] };
  // Бодит frontend-тэй адил: зөвхөн hasCustomQuestions === false үед алгасна —
  // тодорхойгүй бол cq-г асууж үзээд хоосон бол дуусгана.
  if (state.info.hasCustomQuestions !== false && !state.customSubmitted) return { kind: "custom" };
  return { kind: "done" };
}

function stageKeyOf(stage: Stage) {
  return stage.kind === "test" ? `test:${stage.test.id}` : stage.kind;
}

function sortByQuestionOrder(questions: QuestionWithRule[] | undefined) {
  return [...(questions ?? [])].sort((a, b) => a.questionOrder - b.questionOrder);
}

function hasAnswer(answer: LocalAnswer | undefined) {
  return Boolean(answer && (answer.optionId !== undefined || answer.optionIds?.length || answer.text?.trim()));
}

/** LocalAnswer → Swagger-ийн QuestionAnswerRequest. Survey-ийн submit-тэй адил
 *  хариулаагүй (заавал биш) асуултыг ч илгээнэ — optionIds/textAnswer-гүйгээр,
 *  зөвхөн duration-тэй; ингэснээр бүгд алгассан үед ч `answers` хоосон болохгүй. */
function toAnswerRequest(
  question: QuestionWithRule,
  answer: LocalAnswer | undefined,
  metrics: Pick<QuestionAnswerRequest, "duration" | "visibleMs" | "firstInteractionMs" | "changeCount">,
): QuestionAnswerRequest {
  const optionIds = answer?.optionIds ?? (answer?.optionId !== undefined ? [answer.optionId] : undefined);
  const text = answer?.text?.trim();
  return {
    questionId: question.id,
    ...(optionIds?.length ? { optionIds } : {}),
    ...(text ? { textAnswer: text.slice(0, TEXTAREA_DEFAULT_MAX_LENGTH) } : {}),
    ...metrics,
  };
}

/** QuestionAnswerRequest → collector-staging-ийн хуучин AnswerChoice[]
 *  (TestSubmission.answerList-ийг үз). Survey-ийн submit-тэй адил MULTI_CHOICE-д
 *  сонгосон option бүрт тусдаа AnswerChoice (ижил questionId-тай) үүсгэнэ. */
function toAnswerChoices(question: QuestionWithRule, request: QuestionAnswerRequest): AnswerChoice[] {
  const base = { questionId: request.questionId, questionType: question.questionType, duration: request.duration };
  if (request.optionIds?.length) return request.optionIds.map((optionId) => ({ ...base, optionId }));
  return [{ ...base, ...(request.textAnswer ? { content: request.textAnswer } : {}) }];
}

export default function TalentTestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { level: fontLevel } = useFontSize();

  // АНХААР (hydration): localStorage-ыг survey-ийн хуудсуудын адил mount-ын
  // дараах effect дотор л уншина (src/lib/use-survey.ts-ийн тайлбарыг үз).
  const [talent, setTalent] = useState<TalentState | null>(null);
  const [completedBefore, setCompletedBefore] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [section, setSection] = useState<LoadedSection | null>(null);
  const [batchIndex, setBatchIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, LocalAnswer>>({});
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCompletedBefore(isTalentCompleted(token));
    setTalent(loadTalentState(token));
    setReady(true);
  }, [token]);

  const stage = talent ? currentStage(talent) : null;
  const isDone = stage?.kind === "done";
  const inQuestions = section !== null;
  const batches = section ? chunkQuestions(section.questions, section.pageSize) : [];
  const currentBatch = batches[batchIndex] ?? [];
  const isLastBatch = batchIndex === batches.length - 1;
  const canProceed = currentBatch.every((question) => isQuestionAnswered(question, answers));
  const batchProgress = batches.length ? Math.round(((batchIndex + 1) / batches.length) * 100) : 0;

  const tracker = useBrowserEventTracker({
    active: inQuestions,
    sessionId: talent?.info.sessionId,
    authorization: talent?.info.authorization,
    testAnswerId: section?.id,
  });
  const fullscreen = useTalentFullscreen();
  const engagement = useQuestionEngagement(
    currentBatch.map((question) => question.id),
    inQuestions && !fullscreen.blocking,
  );

  // Бодит frontend-тэй адил: FULLSCREEN_EXIT-ийг зөвхөн асуулт бөглөж байх үед бүртгэнэ.
  const { track, flush } = tracker;
  useEffect(() => {
    if (!inQuestions) return;
    return fullscreen.onExit(() => {
      track("FULLSCREEN_EXIT");
      void flush();
    });
  }, [inQuestions, fullscreen.onExit, track, flush]);

  // Эхлээгүй/мэдээлэлгүй үед (жишээ нь /test URL-ыг шууд нээсэн) нүүр хуудас
  // руу буцаана — тэнд урилгыг load → info-гоор эхнээс нь ачаална.
  const needsLanding = ready && !completedBefore && !expired && !talent?.started;
  useEffect(() => {
    if (needsLanding) router.replace(`/talent/${token}`);
  }, [needsLanding, router, token]);

  // Бүх хэсэг илгээгдсэн — token зэрэг төлөвийг устгаж, "дууссан" гэж тэмдэглэнэ.
  useEffect(() => {
    if (isDone) markTalentCompleted(token);
  }, [isDone, token]);

  useEffect(() => {
    if (!section) return;
    saveTalentProgress(token, { stageKey: section.stageKey, batchIndex, answers });
  }, [token, section, batchIndex, answers]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `batchIndex`/`section` intentionally reset scroll and pending auto-advance on every page change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    return () => {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    };
  }, [batchIndex, section]);

  if (!ready || needsLanding) {
    return <TalentStatusScreen>{TALENT_TEXT.loading}</TalentStatusScreen>;
  }

  if (completedBefore || isDone) return <TalentCompletedScreen />;

  if (expired || !talent || !stage) {
    return (
      <TalentStatusScreen>
        <p>{expired ? TALENT_TEXT.expired : TALENT_TEXT.noSession}</p>
        <Link
          href={`/talent/${token}`}
          className="mt-4 inline-block text-sm font-medium text-[#7094FF] underline underline-offset-2"
        >
          {TALENT_TEXT.reopenInvitation}
        </Link>
      </TalentStatusScreen>
    );
  }

  const { info } = talent;
  const themeVars = surveyThemeCssVars(resolveSurveyTheme(info.design));
  const tests = info.tests ?? [];
  const sectionTitle =
    stage.kind === "test" ? `${TALENT_TEXT.testTitlePrefix}${stage.index + 1}` : TALENT_TEXT.customTitle;

  /** Token хүчинтэй эсэх — сүлжээний алдаа биш бол (false, 401, JWT алдааны 500)
   *  бүгдийг хүчингүй гэж үзнэ (бодит frontend-тэй адил). */
  async function isTokenValid(authorization: string) {
    try {
      return await checkRecruitmentToken(authorization);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) throw err;
      return false;
    }
  }

  function handleExpired() {
    clearTalentSession(token);
    setSection(null);
    setExpired(true);
  }

  function updateTalent(next: TalentState) {
    saveTalentState(token, next);
    setTalent(next);
  }

  async function startSection() {
    if (!talent || !stage || stage.kind === "done" || busy) return;
    setBusy(true);
    try {
      if (!(await isTokenValid(talent.info.authorization))) {
        toast.error(TALENT_TEXT.tokenInvalid);
        handleExpired();
        return;
      }

      let loaded: LoadedSection;
      if (stage.kind === "test") {
        const dto = await getTestQuestions(talent.info.sessionId, stage.test.id, talent.info.authorization);
        loaded = {
          stageKey: stageKeyOf(stage),
          id: dto.id,
          authorization: dto.authorization || talent.info.authorization,
          pageSize: dto.pageSize && dto.pageSize > 0 ? dto.pageSize : 1,
          questions: sortByQuestionOrder(dto.question),
          loadedAt: Date.now(),
        };
        if (loaded.questions.length === 0) {
          toast.error(TALENT_TEXT.noQuestions);
          return;
        }
      } else {
        const dto = await getCustomQuestions(talent.info.sessionId, talent.info.authorization);
        loaded = {
          stageKey: stageKeyOf(stage),
          id: dto.id,
          authorization: dto.authorization || talent.info.authorization,
          pageSize: dto.pageSize && dto.pageSize > 0 ? dto.pageSize : 1,
          // Эхний ба төгсгөлийн бүлгийг тус тусад нь эрэмбэлээд залгана
          // (survey-ийн customQuestionFirst/Last-тай ижил шалтгаан — use-survey.ts).
          questions: [...sortByQuestionOrder(dto.startQuestions), ...sortByQuestionOrder(dto.endQuestions)],
          loadedAt: Date.now(),
        };
        if (loaded.questions.length === 0) {
          // Нэмэлт асуулт байхгүй — бодит frontend-тэй адил шууд дуусгана.
          updateTalent({ ...talent, customSubmitted: true });
          return;
        }
      }

      const progress = loadTalentProgress(token);
      const restored = progress?.stageKey === loaded.stageKey ? progress : null;
      engagement.reset();
      setAnswers(restored?.answers ?? {});
      setBatchIndex(
        restored ? Math.min(restored.batchIndex, chunkQuestions(loaded.questions, loaded.pageSize).length - 1) : 0,
      );
      setSection(loaded);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        handleExpired();
        return;
      }
      toast.error(
        getTalentErrorMessage(err, stage.kind === "test" ? TALENT_TEXT.testLoadFailed : TALENT_TEXT.customLoadFailed),
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitSection() {
    if (!talent || !section || busy) return;
    setBusy(true);
    try {
      const requests = section.questions.map((question) =>
        toAnswerRequest(
          question,
          answers[question.id],
          engagement.metricsForSubmit(question.id, hasAnswer(answers[question.id])),
        ),
      );
      const submission: TestSubmission = {
        id: section.id,
        answers: requests,
        answerList: section.questions.flatMap((question, index) => toAnswerChoices(question, requests[index])),
        totalTimeTaken: Math.floor((Date.now() - section.loadedAt) / 1000),
      };
      // Бодит frontend-тэй адил: submit-ээс өмнө үлдсэн event-үүдийг илгээнэ.
      await tracker.flush({ force: true });
      if (section.stageKey === "custom") {
        await submitCustomQuestionAnswers(section.authorization, submission);
        updateTalent({ ...talent, customSubmitted: true });
      } else {
        await submitTest(section.authorization, submission);
        const submittedId = section.stageKey.slice("test:".length);
        updateTalent({ ...talent, submittedTestIds: [...talent.submittedTestIds, submittedId] });
        toast.success(TALENT_TEXT.testSubmittedToast);
      }
      clearTalentProgress(token);
      setSection(null);
      setAnswers({});
      setBatchIndex(0);
      setConfirmOpen(false);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        handleExpired();
        return;
      }
      toast.error(
        getTalentErrorMessage(
          err,
          section.stageKey === "custom" ? TALENT_TEXT.customSubmitFailed : TALENT_TEXT.testSubmitFailed,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function handleSelect(question: QuestionWithRule, optionId: number, indexInBatch: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: { optionId } }));
    engagement.noteAnswer(question.id, "choice");

    // Survey-ийн асуултын хуудастай ижил: нэг сонголтоор дуусдаг асуултад
    // дараагийн асуулт руу (батч горимд — scroll, эс бөгөөс — дараагийн хуудас) шилжинэ.
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    if (!SELECTABLE_TYPES.has(question.questionType)) return;
    if (currentBatch.length === 1) {
      if (isLastBatch) return;
      autoAdvanceTimeoutRef.current = setTimeout(() => setBatchIndex((i) => i + 1), AUTO_ADVANCE_DELAY_MS);
      return;
    }
    const nextQuestion = currentBatch[indexInBatch + 1];
    if (!nextQuestion) return;
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      questionRefs.current[nextQuestion.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, AUTO_ADVANCE_DELAY_MS);
  }

  // Survey-тэй адил: дээд тооноос давбал хамгийн эртний сонголтыг (FIFO) солино.
  function handleMultiToggle(question: QuestionWithRule, optionId: number) {
    setAnswers((prev) => {
      const current = prev[question.id]?.optionIds ?? [];
      const max = question.maxAnswerCount ?? 9999;
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : current.length >= max
          ? [...current.slice(1), optionId]
          : [...current, optionId];
      return { ...prev, [question.id]: { ...prev[question.id], optionIds: next } };
    });
    engagement.noteAnswer(question.id, "choice");
  }

  function handleTextChange(question: QuestionWithRule, text: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id], text } }));
    engagement.noteAnswer(question.id, "text");
  }

  function handlePrev() {
    if (batchIndex === 0 || busy) return;
    setBatchIndex((i) => Math.max(0, i - 1));
  }

  function handleNext() {
    if (!canProceed || busy) return;
    if (!isLastBatch) {
      setBatchIndex((i) => i + 1);
      return;
    }
    // Нэмэлт асуулт бол бодит frontend-тэй адил илгээхээс өмнө баталгаажуулна.
    if (section?.stageKey === "custom") setConfirmOpen(true);
    else void submitSection();
  }

  const stepper = (
    <Stepper
      tests={tests}
      submittedTestIds={talent.submittedTestIds}
      showCustom={info.hasCustomQuestions !== false}
      stage={stage}
    />
  );

  if (!section) {
    const questionCount =
      stage.kind === "test"
        ? stage.test.questionCount && stage.test.questionCount > 0
          ? stage.test.questionCount
          : "–"
        : info.customQuestionCount || "–";
    const minutes =
      stage.kind === "test" && (stage.test.minMinutes || stage.test.maxMinutes)
        ? `${stage.test.minMinutes ?? 0}-${stage.test.maxMinutes ?? 0} ${TALENT_TEXT.minutesSuffix}`
        : `– ${TALENT_TEXT.minutesSuffix}`;

    return (
      <main
        className={`flex flex-1 flex-col items-center bg-[var(--survey-bg)] px-4 py-16 md:px-7.5 ${manrope.className}`}
        style={themeVars}
      >
        <div className="flex w-full max-w-lg flex-col gap-8">
          {stepper}
          <TalentCard className="flex flex-col">
            <h1 className="text-xl font-bold text-[#10182B] sm:text-2xl">{sectionTitle}</h1>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-base text-[#10182B]">
              <span>
                {questionCount} {TALENT_TEXT.questionsSuffix}
              </span>
              <span>{minutes}</span>
            </div>
            <p className="mt-5 border-t border-[#E4E8EF] pt-5 text-base text-[#10182B]">
              {stage.kind === "test" ? TALENT_TEXT.testDescription : TALENT_TEXT.customDescription}
            </p>
            <div className="mt-10 flex justify-end">
              <TalentPrimaryButton disabled={busy} onClick={startSection}>
                {busy ? TALENT_TEXT.loadingButton : TALENT_TEXT.continueButton}
              </TalentPrimaryButton>
            </div>
          </TalentCard>
        </div>
        <TalentFullscreenOverlays />
      </main>
    );
  }

  return (
    <main
      className={`flex flex-1 flex-col items-center bg-[var(--survey-bg)] px-4 py-16 ${manrope.className}`}
      style={themeVars}
    >
      <div className="w-full max-w-140 space-y-8">
        {stepper}
        <div className="space-y-2">
          <p className={`font-medium text-[var(--survey-desc)] ${META_SIZE_CLASSES[fontLevel]}`}>{sectionTitle}</p>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-[var(--survey-progress-bg)]">
              <div
                className="h-full rounded-full bg-[var(--survey-progress-active)] transition-[width] duration-200"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-[var(--survey-desc)]">{batchProgress}%</span>
          </div>
        </div>

        <div className="space-y-10">
          {currentBatch.map((question, indexInBatch) => (
            <div
              key={question.id}
              ref={(el) => {
                questionRefs.current[question.id] = el;
              }}
              className="space-y-4"
            >
              <QuestionField
                question={question}
                number={batchIndex * section.pageSize + indexInBatch + 1}
                answer={answers[question.id]}
                fontLevel={fontLevel}
                onSelect={(optionId) => handleSelect(question, optionId, indexInBatch)}
                onMultiToggle={(optionId) => handleMultiToggle(question, optionId)}
                onTextChange={(text) => handleTextChange(question, text)}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <TalentSecondaryButton disabled={batchIndex === 0 || busy} onClick={handlePrev}>
            {TALENT_TEXT.backButton}
          </TalentSecondaryButton>
          <TalentPrimaryButton disabled={!canProceed || busy} onClick={handleNext}>
            {busy ? TALENT_TEXT.submittingButton : isLastBatch ? TALENT_TEXT.submitButton : TALENT_TEXT.continueButton}
          </TalentPrimaryButton>
        </div>
      </div>

      <TalentFullscreenOverlays />

      <Dialog open={confirmOpen} onOpenChange={(open) => !busy && setConfirmOpen(open)}>
        <DialogContent
          showCloseButton={false}
          className={`flex w-full max-w-[calc(100vw-2rem)] flex-col gap-4 rounded-2xl bg-white p-6 sm:max-w-lg ${manrope.className}`}
        >
          <DialogTitle className="text-base font-semibold text-[#10182B]">{TALENT_TEXT.customConfirmTitle}</DialogTitle>
          <DialogDescription className="text-sm text-[#637389]">
            {TALENT_TEXT.customConfirmDescription}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <DialogClose
              disabled={busy}
              className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-sm font-medium text-[#10182B] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
            >
              {TALENT_TEXT.backButton}
            </DialogClose>
            <button
              type="button"
              disabled={busy}
              onClick={submitSection}
              className="rounded-lg bg-[#8CA9FF] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CA9FF]"
            >
              {busy ? TALENT_TEXT.submittingButton : TALENT_TEXT.submitButton}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

/** Тестүүд (+ нэмэлт асуулт)-ын явцын мөр — бодит frontend-ийн stepper-тэй
 *  ижил төлөвүүд: илгээсэн (✓), одоогийн, хүлээгдэж буй. */
function Stepper({
  tests,
  submittedTestIds,
  showCustom,
  stage,
}: {
  tests: RecruitmentTestInfo[];
  submittedTestIds: string[];
  showCustom: boolean;
  stage: Stage;
}) {
  const steps = [
    ...tests.map((test, index) => ({
      key: test.id,
      label: `${TALENT_TEXT.stepTestPrefix} ${index + 1}`,
      done: submittedTestIds.includes(test.id),
      current: stage.kind === "test" && stage.test.id === test.id,
    })),
    ...(showCustom
      ? [{ key: "custom", label: TALENT_TEXT.stepCustom, done: false, current: stage.kind === "custom" }]
      : []),
  ];
  if (steps.length <= 1) return null;

  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
      {steps.map((step, index) => (
        <li key={step.key} className="flex items-center gap-2">
          <span
            aria-current={step.current ? "step" : undefined}
            className={`flex size-7 items-center justify-center rounded-[10px] text-xs font-medium ${
              step.done
                ? "bg-[#7094FF] text-white"
                : step.current
                  ? "border-2 border-[#7094FF] bg-white text-[#7094FF]"
                  : "bg-[#E4E8EF] text-[#637389]"
            }`}
          >
            {step.done ? "✓" : index + 1}
          </span>
          <span
            className={`text-xs ${step.done || step.current ? "font-medium text-[var(--survey-text)]" : "text-[var(--survey-desc)]"}`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && <span aria-hidden="true" className="h-0.5 w-6 bg-[#CBD5E1] sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}
