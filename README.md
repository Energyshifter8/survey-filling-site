# Судалгаа бөглөх апп (Survey модуль)

Next.js (App Router) + TypeScript. `NEXT_PUBLIC_API_URL`-аар зааж өгсөн backend-аас
судалгааны бүх контентыг dynamic ачаална — юу ч hardcode хийгээгүй.

Даалгаврын бүрэн тодорхойлолт: `PROMPT.md`. Энэ README нь тэнд байгаа
"Deliverable" хэсэгт заасан баримтжуулгыг хангана.

## Суулгах, ажиллуулах

```bash
pnpm install
cp .env.example .env.local   # аль хэдийн байгаа бол алгасна
pnpm dev
```

`.env.local`-д доод тал нь нэгийг нь тохируулна (хоёул ижил утгатай байж болно,
код эхнийхийг нь тэргүүлж уншина):

```
NEXT_PUBLIC_API_URL=https://service-staging.mindxplus.com
# эсвэл
NEXT_PUBLIC_SURVEY_API_BASE=https://service-staging.mindxplus.com
```

`http://localhost:3000/s/{shortUrl}`-ээр судалгаанд орно.

## Архитектурын шийдвэрүүд

- **Route бүтэц**: `/s/[shortUrl]` (intro + consent, нэг route дотор 2 алхам —
  сүлжээний дуудлага хийхгүй "Эхлэх" → "Цааш" шилжилт учир тусад нь route
  болгох шаардлагагүй) ба тусдаа `/s/[shortUrl]/questions` (асуултын урсгал).
  Тусад нь route болгосон шалтгаан: consent өгсний дараа судалгаанд "орсон"
  гэдэг нь URL-аар ялгагдах ёстой (буцах товч дарахад дахин consent руу
  буцах ёстой, харин асуултын дундаас "буцах" гэдэг нь өөр логик шаардана),
  мөн questions route дангаараа шинэ session (token/responseSessionId)
  байхгүй бол ажиллахгүй байхыг илэрхийлж чадна (`NO_SESSION` алдаа).
- **Session/token хадгалах арга**: client-side `sessionStorage`
  (`src/lib/survey-session.ts`). Backend Bearer JWT олгодог (httpOnly cookie
  биш) тул session/cookie давхарга нэмэх шаардлагагүй — browser талдаа л
  байх ёстой өгөгдөл. `sessionStorage`-ыг сонгосон шалтгаан: intro/consent →
  questions route хооронд шилжихэд (page navigation, refresh) хадгалагдах
  ёстой, харин tab хаагдмагц цэвэрлэгдэх ёстой (дараагийн хэрэглэгчид дамжуулж
  болохгүй нэг удаагийн судалгаа). In-memory Context ашиглавал refresh дээр
  устах тул тохирохгүй; localStorage бол хэт удаан хадгалагдана.
- **CORS**: `service-staging.mindxplus.com` нь `http://localhost:3000`
  origin-д зориулж `Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials`-ийг
  preflight дээр төдийгүй бодит GET хариу дээр ч зөв тавьдаг нь curl-аар
  шалгагдсан (`PROMPT.md`-ийг үз). Тиймээс **proxy Route Handler хэрэггүй** —
  client component-с шууд `fetch` хийнэ.
- **API давхарга**: `src/lib/api/{client,survey,types}.ts` — нэг цэгт
  төвлөрсөн, base URL-ийг `.env`-ээс уншина. `ApiError` (status кодтой)
  throw хийдэг тул алдааны мессежийг `src/lib/error-messages.ts` дотор
  status-аар нь ялгаж, backend-ийн түүхий текст биш, энгийн үг хэллэгээр
  хэрэглэгчид харуулна (уучлалт биш — юу болсныг тодорхой хэлнэ).
- **Telemetry**: `src/lib/telemetry.ts`-ийн `trackEvent()` — одоогоор зөвхөн
  `console.debug`, учир нь Survey модульд batch-events/beacon endpoint
  баримтжаагүй (зөвхөн Recruitment модульд байгаа). Жинхэнэ endpoint
  батлагдвал энд нэг газар нэмэгдэнэ.

## API талбарын нэрс — баталгаажсан ба TODO үлдсэн зүйлс

Зам/HTTP method 5 endpoint бүгд Swagger docs-оор баталгаажсан (`PROMPT.md`).
Response доторх дотоод талбарын нэрс дараах байдалтай:

| Зүйл | Төлөв |
|---|---|
| 5 endpoint-ийн зам/method | ✅ Баталгаажсан (Swagger) |
| **API host** (`collector-staging.mindxplus.com`, `service-staging` БИШ) | ✅ Баталгаажсан (2026-09, decompiled bundle + бодит curl) |
| `participate`/`check-pass` body — `{deviceId, browser, passCode}` | ✅ Баталгаажсан (2026-09, decompiled bundle + бодит curl 200) |
| `submit` гадна бүтэц — `{templateQuestionAnswers, customQuestionAnswers, sessionId, surveyId}` | ✅ Баталгаажсан (2026-09, decompiled bundle) — **дотоод item-ийн талбарын нэрс (`AnswerChoice`) хэвээр TODO** |
| Бүх хүсэлтэд `Accept-Language: mn-MN` header | ✅ Баталгаажсан (2026-09, decompiled bundle) |
| CORS зөвшөөрөгдсөн эсэх | ✅ Шалгагдсан (curl, зөв host дээр) |
| `GET /s/{shortUrl}` хариу — raw plain-text surveyId (JSON биш) | ✅ Баталгаажсан (2026-09, бодит curl: `Content-Type: text/plain`, body нь зүгээр UUID) — `apiRequestText` ашиглана, `JSON.parse` огт дуудахгүй |
| `question.content`, `option.content`, `option.id` | ✅ Баталгаажсан (2026-09, бодит `/questions` curl хариу) |
| `question.isRequired`, `question.minMinutes`/`maxMinutes` гэх мэт зарим бусад талбар | ⚠️ **Шинэ зөрүү олдсон** — бодит хариунд `required` (`isRequired` биш), `minAnswerCount`/`maxAnswerCount`, `conditional`, `nextQuestionId` гэж ирсэн. `types.ts`-д хараахан засаагүй — доорх мессежийг үз. |
| `survey.title`/`survey.description` | ⚠️ **Одоогийн код буруу таамагласан нь батлагдсан** — бодит `participate` хариунд top-level `title`/`description` талбар байхгүй; оронд нь `survey.pages.START[0].title`/`.content` дотор байна (git түүхэн дэх `findSurveyPage` загвартай төстэй). Хараахан засаагүй. |
| `submit`-ийн дотоод item бүтэц (`questionId`/`optionId`/`duration` нэр зөв эсэх) | ❌ TODO (зориудаар үлдээсэн — доор тайлбарлав) |

## Гараар туршиж баталгаажуулсан зүйлс

- ✅ `pnpm build` — TypeScript, ESLint (`react-hooks` дүрмүүд орсон) алдаагүй
  амжилттай build хийгдсэн.
- ✅ CORS — `curl -X OPTIONS`-ээр preflight, мөн бодит `GET`-ийг
  `Origin: http://localhost:3000`-той зөв host дээр шалгасан.
- ✅ **Бүтэн урсгал (`resolveShortUrl` → `participateSurvey` → `checkPass` →
  `getSurveyQuestions`) real `shortUrl`-аар (`Ew3kamqxsflGK6ly1H7p0`), кодын
  яг явуулдаг request bytes-ийг curl-аар давтан шалгахад **4 дуудлага бүгд
  200 OK** буцаасан (өмнө нь 401 байсан). "Судалгаанд орох хугацаа дууссан"
  мессеж ЭНЭ урсгалд ирэхгүй болсныг батална (алдаа огт гараагүй тул алдааны
  мессеж рүү хүрэхгүй).
- ⚠️ **Browser дээр гараар дарж (click-through) хараахан баталгаажаагүй** —
  Chrome extension энэ session-д холбогдоогүй. curl-аар бүтэн урсгал
  (resolve→participate→check-pass→questions) амжилттай болохыг баталсан ч
  UI/progress bar/consent disable зэрэг client-only зан төлөвийг нүдээр
  харж шалгаагүй.
- ⛔ **`POST /submit`-г бодитоор дуудаагүй** — таны staging survey-д жинхэнэ
  (хуурамч ч гэсэн) хариулт бичих тул зөвшөөрөлгүйгээр дуудаагүй.

## Мэдэгдэж буй хязгаарлалт

- Зөвхөн `SINGLE_CHOICE` асуултын UI бүрэн; бусад төрөл (`MULTI_CHOICE`,
  `MATRIX`, `TEXT` гэх мэт) placeholder мессежтэй.
- Recruitment модуль (`recruitment-client (1).js`) энэ ажилд хамаарахгүй,
  зориудаар хэрэгжүүлээгүй (`PROMPT.md`-ийн тэргүүлэх дараалал).
