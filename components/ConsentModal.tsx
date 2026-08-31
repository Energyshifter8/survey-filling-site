"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const consentClauses = [
  "Энэхүү судалгаанд оролцох нь таны сайн дурын үйлдэл бөгөөд та хэзээ ч судалгаагаа цуцлах эрхтэй.",
  "Таны өгсөн хариултууд нууцлалтай хадгалагдах бөгөөд гуравдагч этгээдэд дамжуулагдахгүй.",
  "Судалгааны явцад таны нэр, хаяг, утасны дугар зэрэг хувийн мэдээлэл асуугдахгүй.",
  "Судалгааны үр дүн нийтээрээ (хувь хүний мэдээлэлгүйгээр) шинжилгээнд ашиглагдана.",
  "Судалгаагаа дуусгасны дараа та үр дүнгийн хураангуйг имэйлээр хүлээн авах боломжтой.",
];

interface ConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentModal({ open, onAccept, onDecline }: ConsentModalProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleClauses = expanded ? consentClauses : consentClauses.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Зөвшөөрөл өгөх</DialogTitle>
          <DialogDescription>
            Дараах нөхцөлтэй танилцсан тохиолдолд судалгаанд оролцох боломжтой.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {visibleClauses.map((clause, i) => (
            <div key={clause} className="flex gap-3 text-sm text-muted-foreground">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="leading-relaxed">{clause}</span>
            </div>
          ))}
        </div>

        {!expanded && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-muted-foreground"
            onClick={() => setExpanded(true)}
          >
            Дэлгэрэнгүй
          </Button>
        )}

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
