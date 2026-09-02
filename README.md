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
| CORS зөвшөөрөгдсөн эсэх | ✅ Шалгагдсан (curl, `Access-Control-Allow-Origin`) |
| `GET /s/{shortUrl}` хариу нь string эсвэл object эсэх | ⚠️ Хоёуланг нь дэмжинэ (`resolveShortUrl`) |
| `survey.title/description/creator/passCodeProtected/...` | ❌ TODO — `src/lib/api/types.ts`-д тэмдэглэгдсэн |
| `question.content`, `option.content`, `option.id` | ❌ TODO — git түүхэнд байсан өмнөх (яг энэ backend-тэй ажиллаж байсан) хувилбараас зээлсэн хамгийн боломжит таамаг, гэхдээ энэ session-д бодит staging хариугаар шалгаагдаагүй |
| `participate`/`check-pass` хүсэлтийн body (deviceId/browser шаардах эсэх) | ❌ TODO — өгөгдсөн reference client body-гүй гэж үзсэн; хэрэв "аль хэдийн бөглөсөн" төлөвийг device-ээр ялгах шаардлагатай бол backend body хүлээж авдаг байж болзошгүй |
| `submit`-ийн body бүтэц (`templateQuestionAnswers`/`customQuestionAnswers`) | ❌ TODO — хамгийн баталгаагүй хэсэг |

**Бодит `shortUrl` жишээ өгөгдмөгц дээрхийг бүгдийг нь staging руу бодит
дуудлага хийж баталгаажуулж, энэ хүснэгтийг шинэчлэх шаардлагатай.**

## Гараар туршиж баталгаажуулсан зүйлс

- ✅ `pnpm build` — TypeScript, ESLint (`react-hooks` дүрмүүд орсон) алдаагүй
  амжилттай build хийгдсэн.
- ✅ `pnpm dev` асаагаад `/s/anything` болон `/s/anything/questions`-г
  curl-аар шалгахад 200, сервер тал алдаагүй (Server Component/route
  түвшинд алдаагүй; өгөгдөл нь client дээр `fetch`-ээр татагддаг тул энэ
  тест зөвхөн route/SSR shell ажиллаж байгааг батална).
- ✅ CORS — `curl -X OPTIONS`-ээр preflight, мөн бодит `GET`-ийг
  `Origin: http://localhost:3000`-той шалгасан.
- ⚠️ **Бүрэн интерактив урсгал (intro → consent → questions → done,
  already-taken, 401 кэйс) хараахан browser дээр гараар дарж баталгаажаагүй** —
  үүнд бодит `shortUrl` (танаас хүлээгдэж байгаа) болон browser tool
  холболт (энэ session-д Chrome extension холбогдоогүй байсан) хэрэгтэй.
  Бодит `shortUrl` өгөгдмөгц дараагийн алхам болгож үүнийг гүйцээнэ.

## Мэдэгдэж буй хязгаарлалт

- Зөвхөн `SINGLE_CHOICE` асуултын UI бүрэн; бусад төрөл (`MULTI_CHOICE`,
  `MATRIX`, `TEXT` гэх мэт) placeholder мессежтэй.
- Recruitment модуль (`recruitment-client (1).js`) энэ ажилд хамаарахгүй,
  зориудаар хэрэгжүүлээгүй (`PROMPT.md`-ийн тэргүүлэх дараалал).
