"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const consentClauses = [
  "Энэхүү судалгаанд оролцох нь бүрэн сайн дурын шийдэл бөгөөд та хүссэн үедээ гарч болно.",
  "Таны хувийн мэдээлэл хуулийн дагуу хамгаалагдах бөгөөд гуравдагч этгээдэд дамжуулагдахгүй.",
  "Судалгааны үр дүнг зөвхөн нэгтгэсэн, нэргүй байдлаар тайлагнана.",
  "Хариултыг дүн шинжилгээний зорилгоор 3 жилийн хугацаанд хадгална.",
  "Судалгааны талаар нэмэлт асуулт байвал research@mindx.mn хаягаар холбогдоно уу.",
];

const consentExtraClauses = [
  "Судалгааны өгөгдлийг зөвхөн эрдэм шинжилгээний зорилгоор ашиглана.",
  "Оролцогч нь хэдийд ч судалгааг зогсоох эрхтэй бөгөөд цуглуулсан мэдээллийг устгуулах хүсэлт гаргаж болно.",
];

interface ConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentModal({ open, onAccept, onDecline }: ConsentModalProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Зөвшөөрөл өгөх</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <ol className="list-decimal list-inside space-y-3">
            {consentClauses.map((clause) => (
              <li key={clause} className="text-sm text-muted-foreground leading-relaxed pl-1">
                {clause}
              </li>
            ))}
          </ol>

          {expanded && (
            <ol className="list-decimal list-inside space-y-3" start={6}>
              {consentExtraClauses.map((clause) => (
                <li key={clause} className="text-sm text-muted-foreground leading-relaxed pl-1">
                  {clause}
                </li>
              ))}
            </ol>
          )}
        </div>

        <button
          type="button"
          className="text-sm font-semibold text-primary hover:underline underline-offset-[3px] bg-transparent border-none p-0 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Хураангуйлах" : "Дэлгэрэнгүй →"}
        </button>

        <DialogFooter>
          <Button variant="outline" onClick={onDecline}>
            Татгалзах
          </Button>
          <Button onClick={onAccept}>Зөвшөөрөх</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
