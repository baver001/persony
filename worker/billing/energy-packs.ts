/**
 * Local mirror of future Paddle catalog. IDs are stable app references;
 * paddle_price_id is filled when Paddle Live catalog is linked.
 */
export type EnergyPackDefinition = {
  id: string;
  label: string;
  energyUnits: number;
  currency: string;
  amountCents: number;
  paddlePriceId: string | null;
  sortOrder: number;
};

export const ENERGY_PACK_CATALOG: EnergyPackDefinition[] = [
  {
    id: 'pack_small',
    label: 'Small recharge',
    energyUnits: 2500,
    currency: 'USD',
    amountCents: 499,
    paddlePriceId: null,
    sortOrder: 1,
  },
  {
    id: 'pack_medium',
    label: 'Medium recharge',
    energyUnits: 5000,
    currency: 'USD',
    amountCents: 899,
    paddlePriceId: null,
    sortOrder: 2,
  },
  {
    id: 'pack_full',
    label: 'Full battery',
    energyUnits: 10_000,
    currency: 'USD',
    amountCents: 1499,
    paddlePriceId: null,
    sortOrder: 3,
  },
];

export function getEnergyPack(packId: string): EnergyPackDefinition | undefined {
  return ENERGY_PACK_CATALOG.find((p) => p.id === packId);
}
