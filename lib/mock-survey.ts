export interface SurveyOption {
  id: string;
  label: string;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  required: boolean;
  type: "SINGLE_CHOICE";
  options: SurveyOption[];
}

export interface MockSurvey {
  code: string;
  title: string;
  description: string;
  publisherName: string;
  questionCount: number;
  estimatedMinutes: { min: number; max: number };
  questions: SurveyQuestion[];
}

export const mockSurvey: MockSurvey = {
  code: "demo123",
  title: "Ажлын орчин ба багийн хамтын ажиллагааны үнэлгээ",
  description:
    "Таны санал бидэнд ажлын орчинг сайжруулах, багийн хамтын ажиллагааг бэхжүүлэхэд чухал нөлөө үзүүлнэ. Энэхүү судалгаанд таны нэр, хаяг зэрэг хувийн мэдээлэл асуугдахгүй.",
  publisherName: "mindX Technologies",
  questionCount: 3,
  estimatedMinutes: { min: 3, max: 5 },
  questions: [
    {
      id: "q1",
      text: "Таны хүйс",
      required: true,
      type: "SINGLE_CHOICE",
      options: [
        { id: "q1_opt1", label: "Эрэгтэй" },
        { id: "q1_opt2", label: "Эмэгтэй" },
        { id: "q1_opt3", label: "Бусад" },
        { id: "q1_opt4", label: "Хариулахыг хүсэхгүй" },
      ],
    },
    {
      id: "q2",
      text: "Таны насны ангилал",
      required: true,
      type: "SINGLE_CHOICE",
      options: [
        { id: "q2_opt1", label: "18-25" },
        { id: "q2_opt2", label: "26-35" },
        { id: "q2_opt3", label: "36-45" },
        { id: "q2_opt4", label: "46-55" },
        { id: "q2_opt5", label: "56-аас дээш" },
      ],
    },
    {
      id: "q3",
      text: "Та ажлынхаа орчинд хэр сэтгэл ханамжтай байна вэ?",
      required: true,
      type: "SINGLE_CHOICE",
      options: [
        { id: "q3_opt1", label: "Маш сэтгэл ханамжтай" },
        { id: "q3_opt2", label: "Сэтгэл ханамжтай" },
        { id: "q3_opt3", label: "Дундаж" },
        { id: "q3_opt4", label: "Сэтгэл ханамжгүй" },
        { id: "q3_opt5", label: "Маш сэтгэл ханамжгүй" },
      ],
    },
  ],
};
