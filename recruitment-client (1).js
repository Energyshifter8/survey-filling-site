// recruitment-client.js
// Swagger docs (Recruitment модуль) дээр баримтжуулсан 6 алхмыг ашигладаг client.
// Зам, HTTP method, дараалал (1-6) — Swagger-ээс шууд авсан тул БАТАЛГААТАЙ.
// Response доторх field нэрс (invitationId, sessionId г.м) БАТАЛГААГҮЙ —
// Swagger UI дээр endpoint бүрийг нээж (">" chevron) request/response
// схемийг харж, "// TODO: confirm" тэмдэглэсэн газруудыг засаарай.

// .env.local-д тохируулна: NEXT_PUBLIC_RECRUITMENT_API_BASE=https://...
// Client component-с (browser) дуудагдах тул NEXT_PUBLIC_ угтвар ЗААВАЛ хэрэгтэй.
const API_BASE =
  process.env.NEXT_PUBLIC_RECRUITMENT_API_BASE || "https://your-api-domain.example.com";

class RecruitmentTestClient {
  constructor(invitationToken, baseUrl = API_BASE) {
    this.token = invitationToken; // урилгын линк доторх {token}
    this.baseUrl = baseUrl;
    this.invitationId = null;
    this.sessionId = null;
  }

  async _request(path, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        // TODO: confirm — эх урилгын token-г Bearer болгож ашиглах нь зөв эсэхийг
        // check-token endpoint-оор шалгаж баталгаажуулаарай.
        Authorization: `Bearer ${this.token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Request failed: ${path} -> ${res.status} ${body}`);
    }
    return res.json();
  }

  // 1. GET /public/talents/invitation/{token} — урилгын линкээр load хийх
  async loadInvitation() {
    const data = await this._request(`/public/talents/invitation/${this.token}`, {
      method: "GET",
    });
    this.invitationId = data.invitationId ?? data.id; // TODO: confirm field name
    return data;
  }

  // 2. POST /public/talents/invitation/info/{invitationId} — сонгон шалгаруулалтын мэдээлэл
  async loadRecruitmentInfo() {
    if (!this.invitationId) await this.loadInvitation();
    const data = await this._request(`/public/talents/invitation/info/${this.invitationId}`, {
      method: "POST",
    });
    this.sessionId = data.sessionId ?? data.session?.id; // TODO: confirm field name
    return data; // жишээ: ажлын байр, компанийн нэр, тестийн заавар г.м агуулж болно
  }

  // 3. POST /public/talents/invitation/qn/{sessionId} — үндсэн тестийн асуултууд
  async getTestQuestions() {
    if (!this.sessionId) await this.loadRecruitmentInfo();
    return this._request(`/public/talents/invitation/qn/${this.sessionId}`, {
      method: "POST",
    });
  }

  // 4. POST /public/talents/invitation/qn/submit — үндсэн тестийн хариулт илгээх
  async submitTestAnswers(answers) {
    return this._request(`/public/talents/invitation/qn/submit`, {
      method: "POST",
      body: JSON.stringify({ sessionId: this.sessionId, answers }), // TODO: confirm body бүтэц
    });
  }

  // 5. GET /public/talents/invitation/cq/{sessionId} — нэмэлт асуултууд
  async getAdditionalQuestions() {
    return this._request(`/public/talents/invitation/cq/${this.sessionId}`, {
      method: "GET",
    });
  }

  // 6. POST /public/talents/invitation/cq/submit — нэмэлт асуултын хариулт илгээх
  async submitAdditionalAnswers(answers) {
    return this._request(`/public/talents/invitation/cq/submit`, {
      method: "POST",
      body: JSON.stringify({ sessionId: this.sessionId, answers }), // TODO: confirm body бүтэц
    });
  }

  // GET /public/talents/check-token — Bearer token хүчинтэй эсэхийг шалгах
  // (хуудас дахин ачаалагдах/resume хийх үед хэрэгтэй)
  async checkToken() {
    return this._request(`/public/talents/check-token`, { method: "GET" });
  }

  // Browser event telemetry (заавал биш, дараа нэмж болно)
  async sendBeacon(eventData) {
    if (!this.sessionId) return;
    return this._request(`/public/talents/recruitment-tests/${this.sessionId}/beacon`, {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  }

  async sendBatchEvents(events) {
    if (!this.sessionId) return;
    return this._request(
      `/public/talents/recruitment-tests/${this.sessionId}/batch-events`,
      { method: "POST", body: JSON.stringify({ events }) }
    );
  }
}

export { RecruitmentTestClient };
