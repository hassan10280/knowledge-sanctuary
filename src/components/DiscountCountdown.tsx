import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface DiscountCountdownProps {
  endDate: string;
  className?: string;
}

const DiscountCountdown = ({ endDate, className = "" }: DiscountCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (expired) return null;
  if (!timeLeft) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-destructive ${className}`}>
      <Clock className="h-2.5 w-2.5" />
      Ends in {timeLeft}
    </span>
  );
};

export default DiscountCountdown;
