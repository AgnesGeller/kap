"use client";

import { useState } from "react";

import { getHungarianCityFromPostalCode } from "@/lib/hungary/postalCodes";

type PostalCityFieldsProps = {
  defaultPostalCode?: string;
  defaultSettlement?: string;
};

export function PostalCityFields({
  defaultPostalCode = "",
  defaultSettlement = "",
}: PostalCityFieldsProps) {
  const [postalCode, setPostalCode] = useState(defaultPostalCode);
  const [settlement, setSettlement] = useState(defaultSettlement);

  function handlePostalCodeChange(value: string) {
    const normalized = value.replace(/\D/g, "").slice(0, 4);
    setPostalCode(normalized);

    const city = getHungarianCityFromPostalCode(normalized);
    if (city) {
      setSettlement(city);
    }
  }

  return (
    <div className="mt-5 grid gap-5 md:grid-cols-[0.35fr_0.65fr]">
      <div className="space-y-2">
        <label htmlFor="postalCode" className="text-sm font-bold text-[#2a211a]">
          Irányítószám
        </label>
        <input
          id="postalCode"
          name="postalCode"
          type="text"
          inputMode="numeric"
          value={postalCode}
          placeholder="2013"
          onChange={(event) => handlePostalCodeChange(event.target.value)}
          className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="settlement" className="text-sm font-bold text-[#2a211a]">
          Település
        </label>
        <input
          id="settlement"
          name="settlement"
          value={settlement}
          placeholder="Pl. Pomáz"
          onChange={(event) => setSettlement(event.target.value)}
          className="w-full rounded-[18px] border-2 border-[#d3c3ad] bg-[#fff8ee] px-4 py-3 text-base font-semibold text-[#17130f] outline-none transition placeholder:text-[#8b7b68] focus:border-[#1e5a40] focus:bg-white"
        />
      </div>
    </div>
  );
}
