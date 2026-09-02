// survey-client.js
// Динамик судалгаа (survey) бөглөх урсгалыг удирдах жижиг, framework-agnostic клиент.
// React/Vue/vanilla ямар ч frontend дээр импортлоод ашиглаж болно.
//
// АНХААРАХ: доорх зам (path) болон талбарын нэрүүд (field names) нь
// browser DevTools дээрх Network tab-аас ажиглагдсан баримтад үндэслэсэн
// таамаглал юм. Өөрийн backend/staging орчны бодит Headers + Payload +
// Response-той тулгаж, шаардлагатай бол path/field нэрсийг өөрчлөөрэй.

const API_BASE = "https://your-api-domain.example.com"; // TODO: өөрийн backend/staging URL-аар солих

class SurveyClient {
  constructor(shortCode, baseUrl = API_BASE) {
    this.shortCode = shortCode;
    this.baseUrl = baseUrl;
    this.surveyId = null;
    this.token = null; // check-pass-аас гарах JWT
    this.responseSessionId = null;
  }

  async _request(path, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Request failed: ${path} -> ${res.status} ${body}`);
    }
    return res.json();
  }

  // 1. shortCode-оор судалгааны мэдээлэл (id гэх мэт) авах — token хэрэггүй
  async loadSurvey() {
    const data = await this._request(`/s/${this.shortCode}`);
    this.surveyId = data.id ?? data.survey?.id;
    return data;
  }

  // 2. Энэ хэрэглэгч/session өмнө нь бөглөсөн эсэхийг шалгах — token хэрэггүй
  async checkParticipation() {
    if (!this.surveyId) await this.loadSurvey();
    const data = await this._request(`/participate`, {
      method: "POST",
      body: JSON.stringify({ survey: { id: this.surveyId } }),
    });
    return data; // жишээ: { survey: {...}, taken: boolean }
  }

  // 3. Session + JWT token авах — эндээс хойш бүх дуудлага authenticated болно
  async checkPass() {
    const data = await this._request(`/check-pass`, {
      method: "POST",
      body: JSON.stringify({ surveyId: this.surveyId }),
    });
    this.token = data.token;
    this.responseSessionId = data.responseSessionId;
    return data;
  }

  // 4. Асуултуудыг татах — token заавал шаардлагатай
  async getQuestions() {
    if (!this.token) throw new Error("Эхлээд checkPass() дуудаж token авна уу");
    return this._request(`/questions`);
  }

  // 5. Хариултуудыг илгээх — АНХААР: жинхэнэ endpoint нэр/бүтэц баталгаажаагүй,
  //    зөвхөн логик таамаглал. Backend-ээсээ бодит замыг лавлаарай.
  async submitAnswers(answers) {
    if (!this.token) throw new Error("Token байхгүй байна");
    return this._request(`/submit`, {
      method: "POST",
      body: JSON.stringify({
        responseSessionId: this.responseSessionId,
        answers, // жишээ бүтэц: [{ questionId, value }, ...]
      }),
    });
  }
}

// ---- Ашиглах жишээ ----
async function runSurveyFlow(shortCode) {
  const client = new SurveyClient(shortCode);

  await client.loadSurvey();
  const participation = await client.checkParticipation();

  if (participation.taken) {
    console.log("Энэ судалгааг өмнө нь бөглөсөн байна.");
    return;
  }

  await client.checkPass();
  const questions = await client.getQuestions();
  console.log("Асуултууд:", questions);

  // UI-аас хэрэглэгчийн хариултыг цуглуулсны дараа:
  // await client.submitAnswers(userAnswers);
}

export { SurveyClient, runSurveyFlow };
