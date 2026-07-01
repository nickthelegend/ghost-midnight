import Link from "next/link";

interface PoolActionButtonsProps {
  ticker: string;
}

const PoolActionButtons = ({ ticker }: PoolActionButtonsProps) => {
  return (
    <div className="flex gap-4">
      <Link
        href={`/?tab=Lend`}
        className="flex-1 inline-flex items-center justify-center rounded-lg bg-[#ff6a1a] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#e85f12]"
      >
        Lend {ticker}
      </Link>
      <Link
        href={`/?tab=Borrow`}
        className="flex-1 inline-flex items-center justify-center rounded-lg border border-[#ff6a1a] px-6 py-3 text-sm font-semibold text-[#ff6a1a] transition-colors hover:bg-[#ff6a1a]/10"
      >
        Borrow {ticker}
      </Link>
    </div>
  );
};

export default PoolActionButtons;
