import { Manrope } from "next/font/google";

// Survey landing/consent UI-д хэрэглэдэг фонт — нэг л дор тодорхойлж, дундаа
// (page.tsx болон Portal-оор document.body руу гардаг ConsentModal хоёулаа)
// хуваалцана. ConsentModal DOM мод дотор шууд орших үедээ энэ фонтыг
// эцэг элементээсээ inherit хийж байсан ч Dialog-ыг Portal-той болгосны дараа
// тэр inherit тасарсан тул className-аа шууд авах шаардлагатай болсон.
export const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["500", "600", "700"] });
