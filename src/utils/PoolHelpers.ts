import BigNumber from "bignumber.js";
import { Pool } from "../balancer";

export function calcMaxExactOut(balance: string): BigNumber {
  return new BigNumber(balance).div(2);
}

export function calcMaxExactIn(balance: string): BigNumber {
  return new BigNumber(balance).div(2);
}
export async function getMaxSwapExactOut(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<BigNumber> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress);
  return calcMaxExactOut(reserve);
}

export async function getMaxSwapExactIn(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<BigNumber> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress);
  return calcMaxExactIn(reserve);
}

export async function getMaxAddLiquidity(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<BigNumber> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress);

  return calcMaxExactIn(reserve);
}

export async function getMaxRemoveLiquidity(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<BigNumber> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress);

  return calcMaxExactIn(reserve);
}
