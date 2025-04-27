
import { Alert, Col, Row, Typography, Card, Divider, Button, Tabs, TabsProps, Input, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMasternodeLogicContract, useMulticallContract, useSafe3Contract } from "../../../hooks/useContracts";
import { AvailableSafe3Info, formatAvailableSafe3Info, formatLockedSafe3Info, LockedSafe3Info } from "../../../structs/Safe3";
import { ZERO } from "../../../utils/CurrentAmountUtils";
import { CurrencyAmount } from "@uniswap/sdk";
import { CallMulticallAggregateContractCall, SyncCallMulticallAggregate } from "../../../state/multicall/CallMulticallAggregate";
import { useTranslation } from "react-i18next";

const { Text } = Typography;
const LockedTxLimit = 10;

export interface Safe3Asset {
  safe3Address: string
  availableSafe3Info: AvailableSafe3Info,
  locked: {
    lockedNum: number,
    lockedAmount: CurrencyAmount,
    redeemHeight: number,
    txLockedAmount: CurrencyAmount,

    redeemed: {
      amount: CurrencyAmount,
      count: number
    },
    unredeem: {
      amount: CurrencyAmount,
      count: number
    }

  },
  masternode?: {
    redeemHeight: number,
    lockedAmount: CurrencyAmount
  }
}

export default ({
  safe3Address, setSafe3Asset
}: {
  safe3Address?: string,
  setSafe3Asset: (safe3Asset?: Safe3Asset) => void
}) => {

  const { t } = useTranslation();
  const safe3Contract = useSafe3Contract();
  const masternodeStorageContract = useMasternodeLogicContract();
  const multicallContract = useMulticallContract();
  const [safe3AddressAsset, setSafe3AddressAsset] = useState<Safe3Asset>();
  const [safe3AddressAssetLoading, setSafe3AddressAssetLoading] = useState<boolean>(false);

  useEffect(() => {
    setSafe3Asset(undefined);
    if (safe3Address && safe3Contract) {
      setSafe3AddressAssetLoading(true);
      loadSafe3Asset(safe3Address, (safe3Asset: Safe3Asset) => {
        setSafe3AddressAsset({
          ...safe3Asset
        })
        setSafe3AddressAssetLoading(false);
      });
    } else {
      setSafe3AddressAsset(undefined);
    }
  }, [safe3Address, safe3Contract]);

  const loadSafe3Asset = useCallback(async (address: string, callback: (safe3Asset: Safe3Asset) => void) => {
    if (safe3Contract && masternodeStorageContract && multicallContract) {
      // 查询地址的可用资产信息
      const availableSafe3Info = formatAvailableSafe3Info(await safe3Contract.callStatic.getAvailableInfo(address));
      const _safe3Asset: Safe3Asset = {
        safe3Address: address,
        availableSafe3Info,
        locked: {
          lockedNum: 0,
          lockedAmount: ZERO,
          redeemHeight: 0,
          txLockedAmount: ZERO,

          redeemed: {
            amount: ZERO,
            count: 0
          },
          unredeem: {
            amount: ZERO,
            count: 0
          }
        }
      }
      setSafe3AddressAsset({
        ..._safe3Asset
      });
      const lockedNum = (await safe3Contract.callStatic.getLockedNum(address)).toNumber();
      const lockedPage = Math.ceil(lockedNum / LockedTxLimit);
      const lockedPageCalls = [];
      for (let i = 0; i < lockedPage; i++) {
        const pageQueryCall: CallMulticallAggregateContractCall = {
          contract: safe3Contract,
          functionName: "getLockedInfo",
          params: [address, i * LockedTxLimit, LockedTxLimit]
        }
        lockedPageCalls.push(pageQueryCall);
      }
      const aggregateTimes = Math.ceil(lockedPageCalls.length / LockedTxLimit);
      const lockedSafe3Infos: LockedSafe3Info[] = [];
      for (let i = 0; i < aggregateTimes; i++) {
        const from = i * LockedTxLimit;
        const to = from + LockedTxLimit;
        const calls = lockedPageCalls.filter((_, index) => index >= from && index < to)
        await SyncCallMulticallAggregate(multicallContract, calls);
        calls.map(call => {
          call.result.map(formatLockedSafe3Info)
            .forEach((lockedSafe3Info: LockedSafe3Info) => lockedSafe3Infos.push(lockedSafe3Info));
          // setTempUpdate .... //
          const tempTotal = lockedSafe3Infos
            .map(lockTx => lockTx.amount)
            .reduce((total, amount) => {
              total = total.add(amount);
              return total;
            }, ZERO);
          _safe3Asset.locked.lockedNum = lockedSafe3Infos.length;
          _safe3Asset.locked.lockedAmount = tempTotal;
          setSafe3AddressAsset({
            ..._safe3Asset,
          });
          // setTempUpdate .... //
        });
      }
      const loopResult: {
        redeemHeight: number,
        masternode?: {
          redeemHeight: number,
          lockedAmount: CurrencyAmount
        },
        redeemed: {
          count: number,
          amount: CurrencyAmount
        },
        unredeem: {
          count: number,
          amount: CurrencyAmount
        }
      } = {
        redeemHeight: 1,
        redeemed: {
          count: 0,
          amount: ZERO
        },
        unredeem: {
          count: 0,
          amount: ZERO
        }
      };
      const totalLockedAmount = lockedSafe3Infos.map(lockTx => {
        if (lockTx.isMN) {
          loopResult.masternode = {
            redeemHeight: lockTx.redeemHeight,
            lockedAmount: lockTx.amount
          }
        } else {
          if (lockTx.redeemHeight == 0) {
            lockTx.redeemHeight = 0;
            loopResult.unredeem.count = loopResult.unredeem.count + 1;
            loopResult.unredeem.amount = loopResult.unredeem.amount.add(lockTx.amount);
          } else {
            loopResult.redeemed.count = loopResult.redeemed.count + 1;
            loopResult.redeemed.amount = loopResult.redeemed.amount.add(lockTx.amount);
          }
        }
        return lockTx.amount;
      }).reduce((total, amount) => {
        total = total.add(amount);
        return total;
      }, ZERO);

      _safe3Asset.locked = {
        redeemHeight: loopResult.redeemHeight,
        lockedNum,
        lockedAmount: totalLockedAmount,
        txLockedAmount: loopResult.masternode ? totalLockedAmount.subtract(loopResult.masternode.lockedAmount) : totalLockedAmount,
        unredeem: { ...loopResult.unredeem },
        redeemed: { ...loopResult.redeemed }
      }
      if (loopResult.masternode) {
        _safe3Asset.masternode = {
          redeemHeight: loopResult.masternode.redeemHeight,
          lockedAmount: loopResult.masternode.lockedAmount
        }
      }
      callback(_safe3Asset);
    }
  }, [safe3Contract, masternodeStorageContract, multicallContract]);

  useEffect(() => {
    if (safe3AddressAsset) {
      if (safe3AddressAsset.availableSafe3Info?.amount && safe3AddressAsset.availableSafe3Info?.amount.greaterThan(ZERO)) {
        setSafe3Asset(safe3AddressAsset);
        return;
      }
      if (safe3AddressAsset.locked && safe3AddressAsset.locked.lockedNum && safe3AddressAsset.locked.lockedNum > 0) {
        setSafe3Asset(safe3AddressAsset);
        return;
      }
      setSafe3Asset(safe3AddressAsset);
    }
  }, [safe3AddressAsset]);

  return (<>
    <Col span={12}>
      {
        safe3Address && <>
          <Spin spinning={safe3AddressAssetLoading}>
            <Col span={24} style={{ marginTop: "5px" }}>
              <Text strong type="secondary">{t("wallet_redeems_safe3_avaialbe")}</Text><br />
            </Col>
            <Col span={24}>
              <Text strong delete={
                safe3AddressAsset && safe3AddressAsset.availableSafe3Info && safe3AddressAsset.availableSafe3Info.redeemHeight > 0
              }>{safe3AddressAsset?.availableSafe3Info?.amount.toFixed(2)} SAFE</Text><br />
            </Col>
            <Col span={24} style={{ marginTop: "5px" }}>
              <Text strong type="secondary">{t("wallet_redeems_safe3_locked")}</Text>
              <Divider type="vertical" />
              <Text type="secondary">({t("wallet_redeems_safe3_lockedrecords")}:{safe3AddressAsset?.locked?.lockedNum})</Text>
            </Col>
            <Col span={24}>
              <Text delete={
                safe3AddressAsset && safe3AddressAsset?.locked.unredeem.count == 0
              } strong>{safe3AddressAsset?.locked.lockedAmount.toFixed(2)} SAFE</Text><br />
              <Row>
                <Col span={24}>
                  <Text>未迁移</Text><br />
                  <Text>{safe3AddressAsset?.locked.unredeem.amount.toFixed(2)} SAFE</Text>
                  <Divider type="vertical" />
                  <Text>{safe3AddressAsset?.locked.unredeem.count} </Text>
                </Col>
                <Col span={24}>
                  <Text>已迁移</Text><br />
                  <Text>{safe3AddressAsset?.locked.redeemed.amount.toFixed(2)} SAFE</Text>
                  <Divider type="vertical" />
                  <Text>{safe3AddressAsset?.locked.redeemed.count} </Text>
                </Col>
              </Row>
            </Col>
            {
              safe3AddressAsset?.masternode && <>
                <Col span={24} style={{ marginTop: "5px" }}>
                  <Text strong type="secondary">{t("wallet_redeems_safe3_masternode")}</Text><br />
                </Col>
                <Text strong delete={
                  safe3AddressAsset.masternode.redeemHeight > 0
                }>
                  {safe3AddressAsset.masternode.lockedAmount.toFixed(2)} SAFE
                </Text>
              </>
            }
          </Spin>
        </>
      }
    </Col>
  </>)

}
