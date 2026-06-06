import type { Shop } from "@/lib/types";

export function DateShopFilters({
  date,
  shopId,
  shops,
  onDateChange,
  onShopChange
}: {
  date: string;
  shopId: string;
  shops: Shop[];
  onDateChange: (date: string) => void;
  onShopChange: (shopId: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-sage bg-white p-3 shadow-soft sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium text-ink/70">
        Date
        <input
          className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3 text-ink"
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-ink/70">
        Boutique
        <select
          className="focus-ring h-12 rounded-lg border border-sage bg-mist px-3 text-ink"
          value={shopId}
          onChange={(event) => onShopChange(event.target.value)}
        >
          <option value="">Toutes</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
