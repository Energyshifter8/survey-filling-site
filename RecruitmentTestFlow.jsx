"use client";

// RecruitmentTestFlow.jsx — Swagger-д баримтжуулсан Recruitment урсгалыг
// дагасан Next.js client component. Урилгын {token} нь URL-аас ирнэ
// (жишээ нь: app/invitation/[token]/page.jsx).
//
// Урсгал: intro (сонгон шалгаруулалтын мэдээлэл) -> үндсэн тест (qn) ->
// нэмэлт асуулт (cq, байхгүй бол автоматаар алгасна) -> done.

import { useEffect, useState } from "react";
import { RecruitmentTestClient } from "./recruitment-client";

const STEP = {
  LOADING: "loading",
  ERROR: "error",
  INTRO: "intro",
  MAIN_QUESTIONS: "main_questions",
  ADDITIONAL_QUESTIONS: "additional_questions",
  DONE: "done",
};

export default function RecruitmentTestFlow({ token }) {
  const [client] = useState(() => new RecruitmentTestClient(token));
  const [step, setStep] = useState(STEP.LOADING);
  const [info, setInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await client.loadInvitation();
        const data = await client.loadRecruitmentInfo();
        setInfo(data);
        setStep(STEP.INTRO);
      } catch (e) {
        setError(e.message);
        setStep(STEP.ERROR);
      }
    })();
  }, [client]);

  function resetQuestionState() {
    setCurrent(0);
    setAnswers({});
  }

  async function handleStartTest() {
    try {
      const data = await client.getTestQuestions();
      setQuestions(data.items ?? data); // TODO: confirm response бүтэц
      resetQuestionState();
      setStep(STEP.MAIN_QUESTIONS);
    } catch (e) {
      setError(e.message);
      setStep(STEP.ERROR);
    }
  }

  async function goToAdditionalOrDone() {
    try {
      const cqData = await client.getAdditionalQuestions();
      const cqItems = cqData.items ?? cqData;
      if (!cqItems || cqItems.length === 0) {
        setStep(STEP.DONE);
        return;
      }
      setQuestions(cqItems);
      resetQuestionState();
      setStep(STEP.ADDITIONAL_QUESTIONS);
    } catch (e) {
      setError(e.message);
      setStep(STEP.ERROR);
    }
  }

  function handleSelect(questionId, optionId) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function handleNext(stage) {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      return;
    }
    const payload = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));
    try {
      if (stage === "main") {
        await client.submitTestAnswers(payload);
        await goToAdditionalOrDone();
      } else {
        await client.submitAdditionalAnswers(payload);
        setStep(STEP.DONE);
      }
    } catch (e) {
      setError(e.message);
      setStep(STEP.ERROR);
    }
  }

  const q = questions[current];
  const progress = questions.length ? Math.round((current / questions.length) * 100) : 0;

  return (
    <div className="wrap">
      {step === STEP.LOADING && <p className="muted">Ачааллаж байна...</p>}

      {step === STEP.ERROR && (
        <div>
          <h1>Алдаа гарлаа</h1>
          <p className="muted">{error}</p>
        </div>
      )}

      {step === STEP.INTRO && (
        <div>
          <h1>{info?.title ?? "Сонгон шалгаруулалтын тест"}</h1>
          <p className="muted">{info?.description}</p>
          {info?.companyName && <p className="meta">Компани: {info.companyName}</p>}
          <button className="primary" onClick={handleStartTest}>Эхлэх</button>
        </div>
      )}

      {(step === STEP.MAIN_QUESTIONS || step === STEP.ADDITIONAL_QUESTIONS) && q && (
        <div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <h2 className="question">{current + 1}. {q.text}</h2>
          <div className="options">
            {q.options?.map((opt) => (
              <label
                key={opt.id}
                className={`option ${answers[q.id] === opt.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === opt.id}
                  onChange={() => handleSelect(q.id, opt.id)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <button
            className="primary"
            disabled={!answers[q.id]}
            onClick={() => handleNext(step === STEP.MAIN_QUESTIONS ? "main" : "additional")}
          >
            Үргэлжлүүлэх
          </button>
        </div>
      )}

      {step === STEP.DONE && (
        <div>
          <h1>Баярлалаа!</h1>
          <p className="muted">Таны хариулт амжилттай илгээгдлээ.</p>
        </div>
      )}

      <style jsx>{`
        .wrap {
          max-width: 560px;
          margin: 0 auto;
          padding: 64px 24px;
          font-family: system-ui, sans-serif;
          color: #1a1a2e;
        }
        h1 {
          font-size: 28px;
          font-weight: 500;
          margin: 0 0 16px;
        }
        h2.question {
          font-size: 18px;
          font-weight: 500;
          margin: 24px 0 20px;
        }
        .muted {
          color: #5b5b6b;
          line-height: 1.6;
          margin: 0 0 32px;
        }
        .meta {
          color: #5b5b6b;
          margin: 0 0 20px;
          font-size: 14px;
        }
        .primary {
          background: #7c83fd;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px 28px;
          font-size: 15px;
          cursor: pointer;
        }
        .primary:disabled {
          background: #c7c9f7;
          cursor: not-allowed;
        }
        .progress-track {
          height: 6px;
          background: #eceef7;
          border-radius: 3px;
          margin-bottom: 8px;
        }
        .progress-fill {
          height: 100%;
          background: #7c83fd;
          border-radius: 3px;
          transition: width 0.2s ease;
        }
        .options {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 28px;
        }
        .option {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #dfe0ea;
          border-radius: 8px;
          padding: 14px 16px;
          cursor: pointer;
        }
        .option.selected {
          border-color: #7c83fd;
          background: #f3f4ff;
        }
      `}</style>
    </div>
  );
}
