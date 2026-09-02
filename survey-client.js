// survey-client.js
// Swagger docs (Survey модуль) дээр баримтжуулсан 5 endpoint-ыг ашигладаг client.
// Зам, HTTP method, дараалал (1-5) — Swagger-ээс шууд авсан тул БАТАЛГААТАЙ.
// Request/response-ийн дотоод field нэрс (title, description, options г.м)
// хэвээрээ баталгаажаагүй тул "// TODO: confirm" тэмдэглэсэн газруудыг
// Swagger UI дээр endpoint бүрийг нээж (">" chevron) шалгаарай.

// Таны project-д аль хэдийн байсан NEXT_PUBLIC_API_URL-г тэргүүлж уншина
// (жинхэнэ backend, жишээ: https://service-staging.mindxplus.com).
// NEXT_PUBLIC_SURVEY_API_BASE-ийг зөвхөн fallback болгож үлдээв — ирээдүйд
// хоёр хувьсагч зөрчилдөхөөс сэргийлж, аль болох зөвхөн NEXT_PUBLIC_API_URL-г
// ганцхан газар (энд) тохируулж ашиглахыг зөвлөж байна.
// Анхаар: survey-staging.mindxplus.com бол өөрөө АМЬД FRONTEND (API биш) гэдэг
// нь баталгаажсан тул үүнийг API_BASE болгож бүү ашигла.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_SURVEY_API_BASE ||
  "https://your-api-domain.example.com";

class SurveyClient {
  constructor(shortUrl, baseUrl = API_BASE) {
    this.shortUrl = shortUrl;
    this.baseUrl = baseUrl;
    this.surveyId = null;
    this.responseSessionId = null;
    this.token = null; // check-pass-аас гарах JWT
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

  // 1. GET /s/{shorturl} — судалгааг холбоосоор ачаалах.
  // Image 5-ийн нотолгоогоор энэ дуудлагын хариу нь ОБЪЕКТ БИШ, зүгээр
  // raw string (surveyId шууд) байж болзошгүй — доор хоёуланг нь дэмжив.
  async loadSurvey() {
    const data = await this._request(`/s/${this.shortUrl}`, { method: "GET" });
    this.surveyId = typeof data === "string" ? data : data.surveyId ?? data.id;
    return data;
  }

  // 2. POST /public/survey/{surveyId}/participate — судалгааны мэдээлэл авах +
  // энэ session/хэрэглэгч өмнө нь бөглөсөн эсэхийг шалгах.
  // Гарчиг/тайлбар г.м intro-ийн агуулга ЭНД ирнэ гэж таамаглаж байна
  // (Swagger-ийн тайлбар: "судалгааны мэдээллүүдийг авах").
  async checkParticipation() {
    if (!this.surveyId) await this.loadSurvey();
    return this._request(`/public/survey/${this.surveyId}/participate`, {
      method: "POST",
    }); // жишээ хариу: { survey: { id, title, description, ... }, taken: boolean }
  }

  // 3. POST /public/survey/{surveyId}/check-pass — оролцох token авах
  async checkPass() {
    const data = await this._request(`/public/survey/${this.surveyId}/check-pass`, {
      method: "POST",
    });
    this.token = data.token;
    this.responseSessionId = data.responseSessionId;
    return data;
  }

  // 4. GET /public/survey/{responseSessionId}/questions — асуултууд авах
  async getQuestions() {
    if (!this.responseSessionId) {
      throw new Error("Эхлээд checkPass() дуудаж responseSessionId авна уу");
    }
    return this._request(`/public/survey/${this.responseSessionId}/questions`, {
      method: "GET",
    });
  }

  // 5. POST /public/survey/{responseSessionId}/submit — хариултуудыг хадгалах
  async submitAnswers(answers) {
    return this._request(`/public/survey/${this.responseSessionId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }), // TODO: confirm body бүтэц
    });
  }

  // Сонголттой: судалгааны үр дүнг имэйлээр авах
  async requestResultsByEmail(email) {
    return this._request(`/public/survey/email`, {
      method: "POST",
      body: JSON.stringify({ responseSessionId: this.responseSessionId, email }), // TODO: confirm body бүтэц
    });
  }

  // Сонголттой: судалгаанд оролцсоны дараах санал хүсэлт
  async submitSurveyFeedback(feedback) {
    return this._request(`/public/feedback/survey/${this.responseSessionId}`, {
      method: "POST",
      body: JSON.stringify(feedback), // TODO: confirm body бүтэц
    });
  }
}

export { SurveyClient };
