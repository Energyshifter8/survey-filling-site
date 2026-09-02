"use client";

// SurveyFlow.jsx — Next.js App Router-д зориулсан client component.
// Swagger-ээр баталгаажсан урсгал: loadSurvey (id авах) -> checkParticipation
// (мэдээлэл + taken эсэх) -> intro -> consent -> checkPass (token) ->
// questions -> submit -> done.
//
// Бодит талбарын нэрс (survey.title, question.text г.м) нь backend-ийн
// жинхэнэ response бүтцээс хамаарна — эндэхийг API-тай тулгаад тохируулна уу.

import { useEffect, useState } from "react";
import { SurveyClient } from "./survey-client";

const STEP = {
  LOADING: "loading",
  ERROR: "error",
  ALREADY_TAKEN: "already_taken",
  INTRO: "intro",
  CONSENT: "consent",
  QUESTIONS: "questions",
  DONE: "done",
};

export default function SurveyFlow({ shortUrl }) {
  const [client] = useState(() => new SurveyClient(shortUrl));
  const [step, setStep] = useState(STEP.LOADING);
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await client.loadSurvey();
        const participation = await client.checkParticipation();
        // Intro-ийн агуулга (title, description г.м) энэ хариунаас ирнэ гэж таамаглаж байна
        setSurvey(participation.survey ?? participation);
        setStep(participation.taken ? STEP.ALREADY_TAKEN : STEP.INTRO);
      } catch (e) {
        setError(e.message);
        setStep(STEP.ERROR);
      }
    })();
  }, [client]);

  async function handleStart() {
    setStep(STEP.CONSENT);
  }

  async function handleConsentNext() {
    if (!consented) return;
    try {
      await client.checkPass();
      const data = await client.getQuestions();
      setQuestions(data.items ?? data); // TODO: confirm response бүтэц
      setStep(STEP.QUESTIONS);
    } catch (e) {
      setError(e.message);
      setStep(STEP.ERROR);
    }
  }

  function handleSelect(questionId, optionId) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function handleNextQuestion() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      return;
    }
    try {
      const payload = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));
      await client.submitAnswers(payload);
      setStep(STEP.DONE);
    } catch (e) {
      setError(e.message);
      setStep(STEP.ERROR);
    }
  }

  const progress = questions.length ? Math.round((current / questions.length) * 100) : 0;
  const q = questions[current];

  return (
    <div className="wrap">
      {step === STEP.LOADING && <p className="muted">Ачааллаж байна...</p>}

      {step === STEP.ERROR && (
        <div>
          <h1>Алдаа гарлаа</h1>
          <p className="muted">{error}</p>
        </div>
      )}

      {step === STEP.ALREADY_TAKEN && (
        <div>
          <h1>{survey?.title}</h1>
          <p className="muted">Та энэ судалгааг өмнө нь бөглөсөн байна.</p>
        </div>
      )}

      {step === STEP.INTRO && (
        <div>
          <h1>{survey?.title}</h1>
          <p className="muted">{survey?.description}</p>
          {survey?.publisher && (
            <p className="publisher">
              Судалгаа нийтлэгч: <i>{survey.publisher}</i>
            </p>
          )}
          <button className="primary" onClick={handleStart}>Эхлэх</button>
        </div>
      )}

      {step === STEP.CONSENT && (
        <div>
          <h1>{survey?.title}</h1>
          <p className="meta">
            {survey?.questionsCount} асуулт &nbsp;|&nbsp; {survey?.estimatedTime}
          </p>
          <p className="muted">{survey?.instructions}</p>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
            />
            Зөвшөөрлийн хуудастай танилцсан болно.
          </label>
          <button className="primary" disabled={!consented} onClick={handleConsentNext}>
            Цааш
          </button>
        </div>
      )}

      {step === STEP.QUESTIONS && q && (
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
          <button className="primary" disabled={!answers[q.id]} onClick={handleNextQuestion}>
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
        .publisher {
          color: #5b5b6b;
          font-size: 14px;
          margin: -12px 0 32px;
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 32px;
          font-size: 14px;
          color: #1a1a2e;
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
