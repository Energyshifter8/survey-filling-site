"use client";

import { useEffect, useRef, useState } from "react";
import { getRecruitmentInfo, loadInvitation } from "@/lib/api/recruitment";
import { getBrowserInfo, getBrowserName } from "@/lib/device-info";
import { TALENT_TEXT } from "@/lib/helptext";
import { isTalentCompleted, loadTalentState, saveTalentState, type TalentState } from "@/lib/recruitment-session";

/** Урилгын token-оор (load → info) талентийн мэдээллийг ачаална. Нүүр
 *  (`/talent/[token]`) хуудсанд ашиглана.
 *
 *  - Аль хэдийн дууссан бол (localStorage-ийн тэмдэглэгээ) сүлжээ дуудахгүй.
 *  - Аль хэдийн эхлүүлсэн бол (started) хадгалсан төлөвийг шууд буцаана —
 *    page нь /test руу шилжүүлж, тэнд token-ийг check-token-оор шалгана.
 *  - Эхлээгүй бол бодит frontend-тэй адил load → info-г ДАХИН дуудаж шинэ
 *    мэдээлэл авна (хуучин кэшийг ашиглахгүй).
 *
 *  Hydration болон StrictMode давхар mount-ын асуудлыг use-survey.ts-ийн
 *  useSurveyMeta-тай яг ижил зарчмаар (null-ээр эхэлж, effect дотор уншиж,
 *  `fetchedForRef`-ээр давхар дуудлагаас сэргийлж) шийдсэн. */
export function useTalentInvitation(token: string) {
  const [state, setState] = useState<TalentState | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const fetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (isTalentCompleted(token)) {
      setCompleted(true);
      setLoading(false);
      return;
    }
    const cached = loadTalentState(token);
    if (cached?.started) {
      setState(cached);
      setLoading(false);
      return;
    }
    if (fetchedForRef.current === token) return;
    fetchedForRef.current = token;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const invitationId = await loadInvitation(token);
        const info = await getRecruitmentInfo(invitationId, {
          deviceId: getBrowserInfo().deviceId,
          browser: getBrowserName(),
        });
        if (fetchedForRef.current !== token) return;
        if (!info?.sessionId || !info.authorization) throw new Error(TALENT_TEXT.infoFailed);
        const next: TalentState = {
          invitationId,
          info,
          started: false,
          submittedTestIds: [],
          customSubmitted: false,
        };
        saveTalentState(token, next);
        setState(next);
      } catch (err) {
        if (fetchedForRef.current === token) setError(err);
      } finally {
        if (fetchedForRef.current === token) setLoading(false);
      }
    })();
  }, [token]);

  return { state, completed, loading, error };
}
