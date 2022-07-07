import BigNumber from "bignumber.js";
import { Pool } from "../balancer";

export function calcMaxExactSwapOut(balance: string): BigNumber {
  return new BigNumber(balance).div(2);
}

export function calcMaxExactSwapIn(balance: string): BigNumber {
  return new BigNumber(balance).div(2);
}
export function calcMaxExactExit(balance: string): BigNumber {
  return new BigNumber(balance).div(3);
}

export function calcMaxExactJoin(balance: string): BigNumber {
  return new BigNumber(balance).div(3);
}
export async function getMaxSwapExactOut(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<BigNumber> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress);
  return calcMaxExactSwapOut(reserve);
}

export async function getMaxSwapExactIn(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<BigNumber> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress);
  return calcMaxExactSwapIn(reserve);
}

export async function getMaxAddLiquidity(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<BigNumber> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress);
  return calcMaxExactJoin(reserve);
}

export async function getMaxRemoveLiquidity(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<BigNumber> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress);
  return calcMaxExactExit(reserve);
}
