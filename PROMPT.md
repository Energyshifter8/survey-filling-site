# Даалгавар: Dynamic судалгаа бөглөх веб апп — шинэчилсэн хувилбар

## Шинэчлэлтийн тэмдэглэл (staging дээр бодитоор шалгагдсан)

- **API base**: жинхэнэ backend бол `NEXT_PUBLIC_API_URL` (жишээ:
  `https://service-staging.mindxplus.com`) — энэ нь project-д аль хэдийн
  байсан хувьсагч, шинээр зохиох шаардлагагүй.
- **`survey-staging.mindxplus.com` бол API БИШ** — энэ нь өөрөө ажиллаж
  байгаа Next.js frontend (route pattern `/s/[id]/...`, HTML буцаадаг).
  Үүнийг API base болгож бүү ашигла.
- **CORS баталгаажсан асуудалгүй** — `service-staging.mindxplus.com` нь
  `http://localhost:3000` origin-д зориулж `Access-Control-Allow-Origin`
  болон credentials-ийг preflight дээр төдийгүй бодит GET хариу дээр ч
  зөв тавьдаг нь шалгагдсан. **Доор дурдсан proxy route handler-ийн санал
  ХЭРЭГГҮЙ БОЛСОН** — шууд client-side fetch хангалттай.

## Одоогийн байдал (энэ бол дахин reverse-engineering хийх ажил биш)

Урьд нь network traffic-аас таамагласан API урсгалыг **албан ёсны Swagger
docs-оор бүрэн баталгаажуулсан**. Доорх 2 модуль тус тусдаа баримтжуулагдсан:

### 1) Survey модуль (ЭНЭ БОЛ ГОЛ ЗОРИЛТ — судалгаа бөглөх нийтийн урсгал)

| # | Method | Path | Тайлбар |
|---|--------|------|---------|
| 1 | GET | `/s/{shorturl}` | Судалгаанд оролцох холбоосоор судалгааг ачаалах |
| 2 | POST | `/public/survey/{surveyId}/participate` | Судалгааны id-аар мэдээлэл авах (title/description магадгүй эндээс ирнэ) + өмнө бөглөсөн эсэхийг шалгах |
| 3 | POST | `/public/survey/{surveyId}/check-pass` | Судалгаанд оролцох token авах (JWT + responseSessionId) |
| 4 | GET | `/public/survey/{responseSessionId}/questions` | Судалгааны асуултууд авах |
| 5 | POST | `/public/survey/{responseSessionId}/submit` | Хариултуудыг хадгалах |

Нэмэлт (сонголттой, дараа нэмж болно):
- `POST /public/survey/email` — үр дүнг имэйлээр авах
- `POST /public/feedback/survey/{responseSessionId}` — оролцсоны дараах санал хүсэлт
- `POST /public/feedback/report/{id}` — хувь хүний тайланд санал хүсэлт

### 2) Recruitment модуль (хоёрдогч, ажлын горим — invitation-based тест)

| # | Method | Path | Тайлбар |
|---|--------|------|---------|
| 1 | GET | `/public/talents/invitation/{token}` | Урилгын линкээр load хийх |
| 2 | POST | `/public/talents/invitation/info/{invitationId}` | Сонгон шалгаруулалтын мэдээлэл авах |
| 3 | POST | `/public/talents/invitation/qn/{sessionId}` | Тестийн асуултууд авах |
| 4 | POST | `/public/talents/invitation/qn/submit` | Тестийн хариулт илгээх |
| 5 | GET | `/public/talents/invitation/cq/{sessionId}` | Нэмэлт асуултууд авах |
| 6 | POST | `/public/talents/invitation/cq/submit` | Нэмэлт асуултын хариулт илгээх |

Дагалдах: `GET/POST .../recruitment-tests/{sessionId}/beacon`,
`POST .../batch-events`, `GET /public/talents/check-token`.

Admin/HR талын endpoint-ууд (**candidate-facing frontend-д хэрэггүй, бүү
хэрэгжүүл**): `POST /api/customer/recruitments/new-invitation`,
`POST /api/customer/recruitments/extend-invitation`,
`POST /api/admin/tests/new`.

## Одоо бэлэн байгаа файлууд (эдгээрийг УНШИЖ, эхлэл болгож ашигла — дахин
эхнээс бичих шаардлагагүй)

- `survey-client.js` — Survey модулийн 5 endpoint-ыг дуудах client. Зам/method
  баталгаатай, `process.env.NEXT_PUBLIC_SURVEY_API_BASE`-г уншдаг.
- `SurveyFlow.jsx` — Survey-ийн UI (intro → consent → questions → done),
  дээрх client-ийг ашигладаг Next.js client component.
- `recruitment-client.js` — Recruitment модулийн 6 endpoint-ыг дуудах client,
  `process.env.NEXT_PUBLIC_RECRUITMENT_API_BASE`-г уншдаг.
- `RecruitmentTestFlow.jsx` — Recruitment-ийн UI (intro → main тест → нэмэлт
  асуулт → done).
- `.env.example` — хэрэгтэй хувьсагчдын жагсаалт.

**`.env.local`-д би staging API-гийн бодит URL-аа аль хэдийн тохируулсан**
(`NEXT_PUBLIC_SURVEY_API_BASE=...`). Өөрөөр хэлбэл staging орчин руу чинь
шууд hit хийх боломжтой — доорх "Баталгаажуулах" хэсгийг үзнэ үү.

## Тэргүүлэх дараалал

1. **Эхлээд Survey модулийг бүрэн ажиллуулж дуусга** — энэ бол миний
   бодит зорилго (судалгаа бөглөх нийтийн апп).
2. Recruitment модулийг зөвхөн би тусад нь хүсвэл эхлүүлнэ — одоохондоо
   хөндөхгүй байж болно.

## Баталгаажуулах — таамгаар бүү явж, бодитоор шалга

`.env.local`-д staging URL байгаа тул request/response-ийн дотоод field
нэрс (`survey.title`, `question.text`, `option.label`, `submit`-ийн body
бүтэц гэх мэт) дээр цаашид **таамаглахын оронд бодит staging руу тест
дуудлага хийж (curl эсвэл түр script-ээр) жинхэнэ response-ийг харж,
`survey-client.js` болон `SurveyFlow.jsx` доторх "TODO: confirm"
тэмдэглэгээтэй бүх хэсгийг бодит field нэрээр нь солино уу.** Үүнд
шаардлагатай бодит `shorturl` жишээ надаас байхгүй бол надаас асуу.

## Мэдэгдэж буй эрсдэл

- ~~CORS~~ — шалгагдсан, асуудалгүй (дээрх тэмдэглэлийг үз). Proxy route
  хэрэггүй.
- `.env.local`-д ижил утгатай хоёр хувьсагч (`NEXT_PUBLIC_API_URL` ба
  `NEXT_PUBLIC_SURVEY_API_BASE`) зэрэгцэж болзошгүй — код `NEXT_PUBLIC_API_URL`-г
  тэргүүлж уншдаг тул ажиллана, гэхдээ цэвэрлэхийг хүсвэл хоёр дахийг нь
  устгаж болно.
- Token/session хадгалах арга (client-side state vs sessionStorage vs
  server session) сонголтоо тайлбарла.
- `service-staging.mindxplus.com` руу зорилготой бус (invalid path) хүсэлт
  олноороо явуулбал 401/rate-limit/WAF-тай хутгалдах эрсдэлтэй тул —
  бодит `shortUrl`-гүйгээр таамаг хүсэлт олноор бүү давт.

## Даалгаврын шаардлага

1. Next.js (App Router) + React. Бодит route ашигла: `/s/[shortUrl]`
   (intro + consent) ба асуултын алхмуудыг тэр route дотор эсвэл тусдаа
   `/s/[shortUrl]/questions`-д зохион байгуул — аль нь илүү тохиромжтойг
   чи шийдээд учрыг тайлбарла.
2. Судалгааны бүх контент backend-ээс dynamic ачаалагдана, hardcode
   хийхгүй.
3. `checkParticipation()`-ийн хариу `taken: true` бол шууд "already taken"
   төлөв харуул.
4. Алдааны төлөв бүрд ойлгомжтой, интерфэйсийн энгийн үг хэллэгээр мессеж
   харуул (уучлалт биш, юу болсныг тодорхой хэл).
5. Responsive, keyboard focus харагдахуйц байх ёстой. Одоогийн
   `SurveyFlow.jsx` доторх энгийн periwinkle-blue (`#7C83FD`) стилийг
   үргэлжлүүлж болно эсвэл сайжруулж болно.

## Deliverable

- Ажиллаж байгаа Next.js төсөл (`npm run dev`)
- `README.md`: суулгах заавар, CORS шийдвэрлэсэн арга, баталгаажуулсан
  болон үлдэж буй "TODO: confirm" зүйлсийн жагсаалт
- Гараар туршиж баталгаажуулсан кэйсүүд: intro → consent (checkbox
  идэвхгүй үед товч disable) → questions (progress bar зөв шинэчлэгдэх) →
  done, мөн "already taken" ба нэг алдааны кэйс

## Чухал зарчим

Field нэр, session хадгалах арга, route бүтэц зэрэг ямар нэг зүйл
тодорхойгүй бол — taamaглаад дуугүй үргэлжлүүлэхийн оронд **эхлээд staging
руу бодит дуудлага хийж шалга**, боломжгүй бол надаас асуу. Хийсэн
шийдвэр бүрийнхээ учрыг товч тайлбарла.
