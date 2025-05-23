
import { CurrencyAmount, JSBI } from '@uniswap/sdk';
import { Typography, Row, Col, Progress, Table, Badge, Button, Space, Card, Alert, Divider, Modal, Input } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccountManagerContract, useMulticallContract, useSupernodeStorageContract, useSupernodeVoteContract } from '../../../hooks/useContracts';
import { formatSupernodeInfo, SupernodeInfo } from '../../../structs/Supernode';
import { ethers } from 'ethers';
import { useWalletsActiveAccount } from '../../../state/wallets/hooks';
import AddressComponent from '../../components/AddressComponent';
import { useBlockNumber, useSNAddresses, useTimestamp } from '../../../state/application/hooks';
import { RenderNodeState } from './Supernodes';
import useAddrNodeInfo from '../../../hooks/useAddrIsNode';
import { AccountRecord, formatAccountRecord, formatRecordUseInfo } from '../../../structs/AccountManager';
import { DateTimeFormat } from '../../../utils/DateUtils';
import { useTranslation } from 'react-i18next';
import { LockOutlined, UnlockFilled, UnlockOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function toFixedNoRound(number: number, decimalPlaces: number) {
  const str = number.toString();
  const decimalIndex = str.indexOf('.');
  if (decimalIndex === -1) {
    return str;
  }
  const truncatedStr = str.substring(0, decimalIndex + decimalPlaces + 1);
  return parseFloat(truncatedStr).toFixed(decimalPlaces);
}

const Supernode_Page_Size = 5;

export default ({
  selectCallback,
  disabledSNAddresses
}: {
  selectCallback: (supernodeInfo: SupernodeInfo) => void,
  disabledSNAddresses: string[],
}) => {

  const { t } = useTranslation();
  const blockNumber = useBlockNumber();
  const timestamp = useTimestamp();
  const supernodeStorageContract = useSupernodeStorageContract();
  const supernodeVoteContract = useSupernodeVoteContract();
  const accountManagerContract = useAccountManagerContract();
  const multicallContract = useMulticallContract();
  const activeAccount = useWalletsActiveAccount();
  const [supernodes, setSupernodes] = useState<SupernodeInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [queryKey, setQueryKey] = useState<string>();
  const [queryKeyError, setQueryKeyError] = useState<string>();
  const [allVoteNum, setAllVoteNum] = useState<CurrencyAmount>(CurrencyAmount.ether(JSBI.BigInt(1)));
  const [pagination, setPagination] = useState<{
    current?: number,
    pageSize?: number,
    total?: number
  }>();
  const activeAccountNodeInfo = useAddrNodeInfo(activeAccount);
  const couldVote = useMemo(() => {
    return activeAccountNodeInfo && !activeAccountNodeInfo.isSN;
  }, [activeAccountNodeInfo]);
  const snAddresses = useSNAddresses();


  useEffect(() => {
    if (supernodeVoteContract) {
      // 获取总得票
      supernodeVoteContract.callStatic.getAllVoteNum()
        .then(data => {
          if (!JSBI.EQ(JSBI.BigInt(data), JSBI.BigInt(0))) {
            setAllVoteNum(CurrencyAmount.ether(data));
          }
        });
    }
  }, [supernodeVoteContract, blockNumber]);

  useEffect(() => {
    if (supernodeStorageContract && supernodeVoteContract) {
      if ((pagination && pagination.current && pagination.current > 1 && !queryKey)) {
        return;
      }
      if (queryKey) {
        doSearch();
        return;
      }
      // function getNum() external view returns (uint);
      supernodeStorageContract.callStatic.getNum()
        .then(data => {
          if (data.toNumber() == 0) {
            setSupernodes([]);
          }
          setPagination({
            total: data.toNumber(),
            pageSize: pagination ? pagination.pageSize : Supernode_Page_Size,
            current: 1,
          })
        });
    }
  }, [supernodeStorageContract, supernodeVoteContract, activeAccount, blockNumber, queryKey]);

  const loadSupernodeInfoList = useCallback((addresses: string[]) => {
    if (supernodeStorageContract && supernodeVoteContract && accountManagerContract && multicallContract) {
      // function getInfo(address _addr) external view returns (MasterNodeInfo memory);
      const fragment = supernodeStorageContract.interface.getFunction("getInfo")
      const getInfoCalls = addresses.map((address: string) => [
        supernodeStorageContract.address,
        supernodeStorageContract.interface.encodeFunctionData(fragment, [address])
      ]);
      const getTotalVoteNumFragment = supernodeVoteContract.interface.getFunction("getTotalVoteNum")
      const getTotalVoteNumCalls = addresses.map((address: string) => [
        supernodeVoteContract.address,
        supernodeVoteContract.interface.encodeFunctionData(getTotalVoteNumFragment, [address])
      ]);
      const getTotalAmountFragment = supernodeVoteContract.interface.getFunction("getTotalAmount");
      const getTotalAmountCalls = addresses.map((address: string) => [
        supernodeVoteContract.address,
        supernodeVoteContract.interface.encodeFunctionData(getTotalAmountFragment, [address])
      ]);
      const calls = getInfoCalls.concat(getTotalVoteNumCalls).concat(getTotalAmountCalls);
      multicallContract.callStatic.aggregate(calls)
        .then(data => {
          const multicallDatas = data[1];
          const supernodeInfos: SupernodeInfo[] = [];
          for (let i = 0; i < multicallDatas.length / 3; i++) {
            const infoRaw = multicallDatas[i];
            const totalVoteNumRaw = multicallDatas[i + (multicallDatas.length / 3)];
            const totalAmountRaw = multicallDatas[i + (multicallDatas.length / 3) * 2];
            const _supernodeInfo = supernodeStorageContract.interface.decodeFunctionResult(fragment, infoRaw)[0];
            const totalVoteNum = supernodeVoteContract.interface.decodeFunctionResult(getTotalVoteNumFragment, totalVoteNumRaw)[0];
            const totalAmount = supernodeVoteContract.interface.decodeFunctionResult(getTotalAmountFragment, totalAmountRaw)[0];
            const supernodeInfo = formatSupernodeInfo(_supernodeInfo);
            supernodeInfo.totalVoteNum = CurrencyAmount.ether(JSBI.BigInt(totalVoteNum));
            supernodeInfo.totalAmount = CurrencyAmount.ether(JSBI.BigInt(totalAmount));
            supernodeInfos.push(supernodeInfo);
          }

          const getRecordByIDFragment = accountManagerContract.interface.getFunction("getRecordByID");
          const getRecordUseInfoFragment = accountManagerContract?.interface?.getFunction("getRecordUseInfo");
          const getRecordByIDCalls = [];
          const getRecordUseInfoCalls = [];
          for (let i = 0; i < supernodeInfos.length; i++) {
            getRecordByIDCalls.push([
              accountManagerContract.address,
              accountManagerContract?.interface.encodeFunctionData(getRecordByIDFragment, [supernodeInfos[i].founders[0].lockID])
            ]);
            getRecordUseInfoCalls.push([
              accountManagerContract.address,
              accountManagerContract?.interface.encodeFunctionData(getRecordUseInfoFragment, [supernodeInfos[i].founders[0].lockID])
            ]);
          }
          const accountRecords: AccountRecord[] = [];
          multicallContract.callStatic.aggregate(getRecordByIDCalls.concat(getRecordUseInfoCalls))
            .then(data => {
              const raws = data[1];
              const half = raws.length / 2;
              for (let i = half - 1; i >= 0; i--) {
                const _accountRecord = accountManagerContract?.interface.decodeFunctionResult(getRecordByIDFragment, raws[i])[0];
                const _recordUseInfo = accountManagerContract?.interface.decodeFunctionResult(getRecordUseInfoFragment, raws[half + i])[0];
                const accountRecord = formatAccountRecord(_accountRecord);
                accountRecord.recordUseInfo = formatRecordUseInfo(_recordUseInfo);
                accountRecords.push(accountRecord);
              }
              accountRecords.forEach(accountRecord => {
                supernodeInfos.forEach(supernodeInfo => {
                  if (supernodeInfo.founders[0].lockID == accountRecord.id) {
                    supernodeInfo.accountRecord = accountRecord;
                  }
                });
              })
              setSupernodes(supernodeInfos);
              setLoading(false);
            });
        })
    }
  }, [supernodeStorageContract, supernodeVoteContract, accountManagerContract, multicallContract, activeAccount]);

  useEffect(() => {
    if (pagination && supernodeStorageContract && supernodeVoteContract && multicallContract) {
      const { pageSize, current, total } = pagination;
      if (current && pageSize && total) {
        //////////////////// 正序 ////////////////////////
        let _position = (current - 1) * pageSize;
        let _offset = pageSize;
        /////////////////////////////////////////////////
        //////////////////// 逆序 ////////////////////////
        let position = total - (pageSize * current);
        let offset = pageSize;
        if (position < 0) {
          offset = pageSize + position;
          position = 0;
        }
        //////////////////////////////////////////////////
        if (total == 0) {
          return;
        }
        setLoading(true);
        supernodeStorageContract.callStatic.getAll(_position, _offset)
          .then((addresses: any) => {
            loadSupernodeInfoList(addresses)
          });
      }
    }
  }, [pagination]);

  const columns: ColumnsType<SupernodeInfo> = [
    {
      title: t("wallet_supernodes_rank"),
      dataIndex: 'id',
      key: '_id',
      render: (id, supernodeInfo: SupernodeInfo) => {
        const { state, accountRecord } = supernodeInfo;
        let locked = true;
        let unlockHeight = accountRecord?.unlockHeight;
        let unlockDateTime = undefined;
        if (unlockHeight) {
          locked = unlockHeight > blockNumber;
          unlockDateTime = unlockHeight - blockNumber > 0 ? DateTimeFormat(((unlockHeight - blockNumber) * 30 + timestamp) * 1000) : undefined;
        }
        const rank = snAddresses ? snAddresses.indexOf(supernodeInfo.addr) + 1 :
          (pagination && pagination.current && pagination.pageSize ? (pagination.current - 1) * pagination.pageSize : 0)
          + (supernodes.indexOf(supernodeInfo) + 1);

        return <>
          <Row>
            <Col>
              {
                <Text strong>{rank}</Text>
              }
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Text>{RenderNodeState(state, t)}</Text>
              {
                locked && <LockOutlined style={{ float: "right", marginTop: "4px" }} />
              }
              {
                !locked && <UnlockOutlined style={{ float: "right", marginTop: "4px" }} />
              }
            </Col>
          </Row>
        </>
      },
      width: "120px"
    },
    {
      title: t("wallet_supernodes_voted"),
      dataIndex: 'id',
      key: '_id',
      render: (_, supernodeInfo: SupernodeInfo) => {
        const { totalAmount, totalVoteNum } = supernodeInfo;
        const voteObtainedRate = totalVoteNum?.divide(allVoteNum).toFixed(6);
        return <>
          <Row>
            <Col span={12} style={{ textAlign: "left" }}>
              <Text strong>{totalVoteNum?.toFixed(2)}</Text>
            </Col>
            <Col span={12} style={{ textAlign: "right" }}>
              <Text type='secondary'>[{totalAmount?.toFixed(2)} SAFE]</Text>
            </Col>
          </Row>
          <Row>
            <Progress percent={Number(toFixedNoRound((Number(voteObtainedRate) * 100), 1))} status={"normal"} />
          </Row>
        </>
      },
      width: "170px"
    },
    {
      title: t("wallet_supernodes_name"),
      dataIndex: 'name',
      key: 'name',
      render: (name, supernodeVO: SupernodeInfo) => {
        return <>
          <Row>
            <Col span={24}>
              <Text title={name} strong style={{ width: "170px" }} ellipsis>
                {name}
              </Text>
            </Col>
            <Col span={24}>
              <Text title={supernodeVO.description} type='secondary' style={{ width: "170px", display: "block" }} ellipsis>
                {supernodeVO.description}
              </Text>
            </Col>
          </Row>
        </>
      },
      width: "150px"
    },
    {
      title: t("supernode"),
      dataIndex: 'addr',
      key: 'addr',
      render: (addr, supernodeInfo: SupernodeInfo) => {
        const { id, founders, incentivePlan } = supernodeInfo;
        return <>
          <Row>
            <Col span={4}>
              <Text type='secondary'>{t("address")}</Text>
            </Col>
            <Col span={20}>
              <Text strong>
                <AddressComponent address={addr} ellipsis copyable qrcode />
              </Text>
            </Col>
          </Row>
          <Row>
            <Col span={4}>
              <Text type='secondary'>ID:</Text>
            </Col>
            <Col span={20}>
              <Text>{id}</Text>
              <Divider type='vertical' />
              <Text type='secondary'>投票分红:{incentivePlan.voter}%</Text>
              <Space direction='horizontal' style={{ float: "right" }}>
                <Button disabled={disabledSNAddresses.indexOf(addr) >= 0} size='small' type='primary' onClick={() => selectCallback(supernodeInfo)}>确定</Button>
              </Space>
            </Col>
          </Row>
        </>
      },
      width: "240px"
    },
  ];

  const doSearch = useCallback(async () => {
    if (supernodeStorageContract && queryKey) {
      if (queryKey.indexOf("0x") == 0) {
        // do query as Address ;
        if (ethers.utils.isAddress(queryKey)) {
          const addr = queryKey;
          setLoading(true);
          const exist = await supernodeStorageContract.callStatic.exist(addr);
          if (exist) {
            const _supernodeInfo = await supernodeStorageContract.callStatic.getInfo(addr);
            loadSupernodeInfoList([_supernodeInfo.addr]);
            setPagination(undefined);
          } else {
            setSupernodes([]);
            setPagination(undefined);
            setQueryKeyError(t("wallet_supernodes_address") + t("notExist"));
            setLoading(false);
          }
        } else {
          setQueryKeyError(t("enter_correct") + t("wallet_supernodes_address"));
        }
      } else {
        const id = Number(queryKey);
        if (id) {
          setLoading(true);
          const exist = await supernodeStorageContract.callStatic.existID(id);
          if (exist) {
            const _supernodeInfo = await supernodeStorageContract.callStatic.getInfoByID(id);
            loadSupernodeInfoList([_supernodeInfo.addr])
            setPagination(undefined);
          } else {
            setSupernodes([]);
            setPagination(undefined);
            setQueryKeyError(t("wallet_supernodes_id") + t("notExist"));
            setLoading(false);
          }
        } else {
          setQueryKeyError(t("wallet_supernodes_query_invalid"));
        }
      }
    }
  }, [supernodeStorageContract, queryKey]);

  return <>

    <Row style={{ marginBottom: "20px" }}>
      {
        <>
          <Col span={12}>
            <Input.Search size='large' placeholder={t("wallet_supernodes_id") + " | " + t("wallet_supernodes_address")} onChange={(event) => {
              setQueryKeyError(undefined);
              if (!event.target.value) {
                setQueryKey(undefined);
              }
            }} onSearch={setQueryKey} />
            {
              queryKeyError &&
              <Alert type='error' showIcon message={queryKeyError} style={{ marginTop: "5px" }} />
            }
          </Col>
        </>
      }
    </Row>

    <Table loading={loading} onChange={(pagination) => {
      const { current, pageSize, total } = pagination;
      setPagination({
        current,
        pageSize,
        total
      })
    }} dataSource={supernodes} columns={columns} size="large" pagination={pagination} />

  </>
}
