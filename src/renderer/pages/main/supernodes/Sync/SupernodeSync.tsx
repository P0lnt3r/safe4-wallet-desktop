import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Col, Divider, Input, Radio, Row, Select, Slider, Space, Spin, Typography } from "antd";

import { useSelector } from "react-redux";
import { ethers } from "ethers";
import { CloseCircleTwoTone, LeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { AppState } from "../../../../state";
import { useMasternodeLogicContract, useMasternodeStorageContract, useMulticallContract, useSupernodeLogicContract, useSupernodeStorageContract } from "../../../../hooks/useContracts";
import { useTransactionAdder } from "../../../../state/transactions/hooks";
import { useWalletsActiveAccount } from "../../../../state/wallets/hooks";
import { TxExecuteStatus } from "../../safe3/Safe3";
import { CallMulticallAggregateContractCall, SyncCallMulticallAggregate } from "../../../../state/multicall/CallMulticallAggregate";
import { enodeRegex, InputRules } from "../Register/SupernodeRegister";
import AddressComponent from "../../../components/AddressComponent";
import { formatSupernodeInfo, SupernodeInfo } from "../../../../structs/Supernode";
import { SuperNodeLogicABI } from "../../../../constants/SystemContractAbiConfig";
import { useTranslation } from "react-i18next";
import { useWeb3React } from "@web3-react/core";

const { Text, Title } = Typography

export default () => {

  const { t } = useTranslation();
  const navigate = useNavigate();
  const editSupernodeId = useSelector((state: AppState) => state.application.control.editSupernodeId);
  const [supernodeInfo, setSupernodeInfo] = useState<SupernodeInfo>();
  const masternodeStorageContract = useMasternodeStorageContract();
  const supernodeStorageContract = useSupernodeStorageContract();
  const supernodeLoginContract = useSupernodeLogicContract(true);
  const addTransaction = useTransactionAdder();
  const multicallContract = useMulticallContract();
  const activeAccount = useWalletsActiveAccount();
  const [updating, setUpdating] = useState<boolean>(false);
  const { provider, chainId } = useWeb3React();
  const [updateParams, setUpdateParams] = useState<{
    address: string | undefined,
    enode: string | undefined,
    description: string | undefined,
    name: string | undefined,
  }>({
    address: undefined,
    enode: undefined,
    description: undefined,
    name: undefined,
  });
  const [inputErrors, setInputErrors] = useState<{
    address?: string,
    enode?: string,
    description?: string,
    name?: string,
  }>();
  const [updateResult, setUpdateResult] = useState<{
    address?: TxExecuteStatus,
    enode?: TxExecuteStatus,
    description?: TxExecuteStatus,
    name?: TxExecuteStatus,
    incentivePlan?: TxExecuteStatus,
  }>();

  const isNodeCreator = useMemo(() => {
    return supernodeInfo?.creator == activeAccount;
  }, [supernodeInfo, activeAccount]);

  const [sliderVal, setSliderVal] = useState<number[]>();
  const needUpdate = useMemo(() => {
    if (sliderVal && supernodeInfo) {
      const partner = sliderVal[0];
      const creator = sliderVal[1] - sliderVal[0];
      const voter = 100 - sliderVal[1];
      const incentivePlanChange = partner != supernodeInfo.incentivePlan.partner
        || creator != supernodeInfo.incentivePlan.creator
        || voter != supernodeInfo.incentivePlan.voter;
      return supernodeInfo?.addr != updateParams.address
        || supernodeInfo?.enode != updateParams.enode
        || supernodeInfo?.description != updateParams.description
        || supernodeInfo?.name != updateParams.name
        || incentivePlanChange;
    }
    return false;
  }, [supernodeInfo, updateParams, sliderVal]);

  useEffect(() => {
    if (editSupernodeId && supernodeStorageContract) {
      supernodeStorageContract.callStatic.getInfoByID(editSupernodeId).then(_supernodeInfo => {
        const supernodeInfo = formatSupernodeInfo(_supernodeInfo);
        const { partner, creator, voter } = supernodeInfo.incentivePlan;
        setSupernodeInfo(supernodeInfo);
        setUpdateParams({
          address: supernodeInfo.addr,
          enode: supernodeInfo.enode,
          description: supernodeInfo.description,
          name: supernodeInfo.name,
        });
        setSliderVal([
          partner,
          creator + partner
        ])
      });
    }
  }, [editSupernodeId, supernodeStorageContract]);



  const doUpdate = useCallback(async () => {
    if (masternodeStorageContract && supernodeStorageContract && multicallContract && supernodeLoginContract && supernodeInfo && provider && chainId) {
      const { address, enode, description, name } = updateParams;
      const inputErrors: {
        address?: string, enode?: string, description?: string, name?: string
      } = {};
      if (!address) {
        inputErrors.address = t("enter") + t("wallet_supernodes_address");
      } else if (!ethers.utils.isAddress(address)) {
        inputErrors.address = t("enter_correct") + t("wallet_supernodes_address");
      }
      if (!enode) {
        inputErrors.enode = t("enter") + t("wallet_supernodes_enode");
      } else {
        const isMatch = enodeRegex.test(enode);
        if (!isMatch) {
          inputErrors.enode = t("enter_correct") + t("wallet_supernodes_enode");
        }
      }
      if (!description) {
        inputErrors.description = t("enter") + t("wallet_supernodes_description");
      } else if (description.length < InputRules.description.min || description.length > InputRules.description.max) {
        inputErrors.description = t("wallet_supernodes_description_lengthrule", { min: InputRules.description.min, max: InputRules.description.max })
      }
      if (inputErrors.address || inputErrors.enode || inputErrors.description) {
        setInputErrors(inputErrors);
        return;
      }
      // Check Address;
      setUpdating(true);
      if (address != supernodeInfo.addr) {
        const addrExistCall: CallMulticallAggregateContractCall = {
          contract: masternodeStorageContract,
          functionName: "exist",
          params: [address]
        };
        const addrIsFounderCall: CallMulticallAggregateContractCall = {
          contract: masternodeStorageContract,
          functionName: "existFounder",
          params: [address]
        };
        const addrExistInSupernodesCall: CallMulticallAggregateContractCall = {
          contract: supernodeStorageContract,
          functionName: "exist",
          params: [address]
        };
        const addrIsSupernodeFounderCall: CallMulticallAggregateContractCall = {
          contract: supernodeStorageContract,
          functionName: "existFounder",
          params: [address]
        };
        await SyncCallMulticallAggregate(multicallContract, [addrExistCall, addrIsFounderCall, addrExistInSupernodesCall, addrIsSupernodeFounderCall])
        const addrExistsInMasternodes: boolean = addrExistCall.result;
        const addrExistsInSupernodes: boolean = addrExistInSupernodesCall.result;
        const addrIsFounder: boolean = addrIsFounderCall.result;
        const addrIsSupernodeFounder: boolean = addrExistInSupernodesCall.result;
        if (addrExistsInMasternodes || addrExistsInSupernodes) {
          if (addrExistsInMasternodes) {
            inputErrors.address = t("wallet_supernodes_address_isnodeaddress")
          }
          if (addrExistsInSupernodes) {
            inputErrors.address = t("wallet_supernodes_address_isnodeaddress")
          }
        }
        if (addrIsFounder || addrIsSupernodeFounder) {
          if (addrIsFounder) {
            inputErrors.address = t("wallet_supernodes_address_joinnode");
          }
          if (addrIsSupernodeFounder) {
            inputErrors.address = t("wallet_supernodes_address_joinnode");
          }
        }
      }
      // Check Enode
      if (enode != supernodeInfo.enode) {
        const enodeExistCall: CallMulticallAggregateContractCall = {
          contract: masternodeStorageContract,
          functionName: "existEnode",
          params: [enode]
        };
        const enodeExistInSupernodesCall: CallMulticallAggregateContractCall = {
          contract: supernodeStorageContract,
          functionName: "existEnode",
          params: [enode]
        }
        await SyncCallMulticallAggregate(multicallContract, [enodeExistCall, enodeExistInSupernodesCall]);
        const enodeExistsInMasternodes: boolean = enodeExistCall.result;
        const enodeExistsInSupernodes: boolean = enodeExistInSupernodesCall.result;
        if (enodeExistsInMasternodes || enodeExistsInSupernodes) {
          inputErrors.enode = t("wallet_supernodes_enodeexist");
        }
      }
      // Check Name
      if (name != supernodeInfo.name) {
        const nameExist = await supernodeStorageContract.callStatic.existName(name);
        if (nameExist) {
          inputErrors.name = t("wallet_supernodes_nameexist");
        }
      }
      if (inputErrors.address || inputErrors.enode || inputErrors.name) {
        setInputErrors({ ...inputErrors });
        setUpdating(false);
        return;
      }
      let _updateResult = updateResult ?? {};
      // DO update address
      if (supernodeInfo.addr != address) {
        try {
          const data = supernodeLoginContract.interface.encodeFunctionData("changeAddress", [
            supernodeInfo.addr, address
          ]);
          const tx: ethers.providers.TransactionRequest = {
            to: supernodeLoginContract.address,
            data,
            chainId
          };
          const estimateGas = await provider.estimateGas({
            ...tx,
            from: activeAccount
          })
          const gasLimit = estimateGas.mul(2);
          tx.gasLimit = gasLimit;
          const { signedTx, error } = await window.electron.wallet.signTransaction(
            activeAccount,
            provider.connection.url,
            tx
          );
          if (signedTx) {
            const response = await provider.sendTransaction(signedTx);
            const { hash, data } = response;
            addTransaction({ to: supernodeLoginContract.address }, response, {
              call: {
                from: activeAccount,
                to: supernodeLoginContract.address,
                input: data,
                value: "0"
              }
            });
            _updateResult.address = {
              txHash: hash,
              status: 1,
            }
          }
          if (error) {
            _updateResult.address = {
              status: 0,
              error: error
            }
          }
        } catch (err: any) {
          _updateResult.address = {
            status: 0,
            error: err
          }
        }
        setUpdateResult({ ..._updateResult });
      } else {
        console.log("Address 无变化,不需更新");
      }
      // DO Update Enode
      if (supernodeInfo.enode != enode) {
        try {
          const data = supernodeLoginContract.interface.encodeFunctionData("changeEnodeByID", [
            supernodeInfo.id, enode
          ]);
          const tx: ethers.providers.TransactionRequest = {
            to: supernodeLoginContract.address,
            data,
            chainId
          };
          const estimateGas = await provider.estimateGas({
            ...tx,
            from: activeAccount
          })
          const gasLimit = estimateGas.mul(2);
          tx.gasLimit = gasLimit;
          const { signedTx, error } = await window.electron.wallet.signTransaction(
            activeAccount,
            provider.connection.url,
            tx
          );
          if (signedTx) {
            const response = await provider.sendTransaction(signedTx);
            const { hash, data } = response;
            addTransaction({ to: supernodeLoginContract.address }, response, {
              call: {
                from: activeAccount,
                to: supernodeLoginContract.address,
                input: data,
                value: "0"
              }
            });
            _updateResult.enode = {
              txHash: hash,
              status: 1,
            }
          }
          if (error) {
            _updateResult.enode = {
              status: 0,
              error: error
            }
          }
        } catch (err: any) {
          _updateResult.enode = {
            status: 0,
            error: err
          }
        }
        setUpdateResult({ ..._updateResult });
      } else {
        console.log("ENODE 无变化,不需更新");
      }
      // DO Update description
      if (description != supernodeInfo.description) {
        try {
          const data = supernodeLoginContract.interface.encodeFunctionData("changeDescriptionByID", [
            supernodeInfo.id, description
          ]);
          const tx: ethers.providers.TransactionRequest = {
            to: supernodeLoginContract.address,
            data,
            chainId
          };
          const estimateGas = await provider.estimateGas({
            ...tx,
            from: activeAccount
          })
          const gasLimit = estimateGas.mul(2);
          tx.gasLimit = gasLimit;
          const { signedTx, error } = await window.electron.wallet.signTransaction(
            activeAccount,
            provider.connection.url,
            tx
          );
          if (signedTx) {
            const response = await provider.sendTransaction(signedTx);
            const { hash, data } = response;
            addTransaction({ to: supernodeLoginContract.address }, response, {
              call: {
                from: activeAccount,
                to: supernodeLoginContract.address,
                input: data,
                value: "0"
              }
            });
            _updateResult.description = {
              txHash: hash,
              status: 1,
            }
          }
          if (error) {
            _updateResult.description = {
              status: 0,
              error: error
            }
          }
        } catch (err: any) {
          _updateResult.description = {
            status: 0,
            error: err
          }
        }
        setUpdateResult({ ..._updateResult });
      } else {
        console.log("Description 无变化,不需更新");
      }
      // DO Update name
      if (name != supernodeInfo.name) {
        try {
          const data = supernodeLoginContract.interface.encodeFunctionData("changeNameByID", [
            supernodeInfo.id, name
          ]);
          const tx: ethers.providers.TransactionRequest = {
            to: supernodeLoginContract.address,
            data,
            chainId
          };
          const estimateGas = await provider.estimateGas({
            ...tx,
            from: activeAccount
          })
          const gasLimit = estimateGas.mul(2);
          tx.gasLimit = gasLimit;
          const { signedTx, error } = await window.electron.wallet.signTransaction(
            activeAccount,
            provider.connection.url,
            tx
          );
          if (signedTx) {
            const response = await provider.sendTransaction(signedTx);
            const { hash, data } = response;
            addTransaction({ to: supernodeLoginContract.address }, response, {
              call: {
                from: activeAccount,
                to: supernodeLoginContract.address,
                input: data,
                value: "0"
              }
            });
            _updateResult.name = {
              txHash: hash,
              status: 1,
            }
          }
          if (error) {
            _updateResult.name = {
              status: 0,
              error: error
            }
          }
        } catch (err: any) {
          console.log("Error >>", err)
          _updateResult.name = {
            status: 0,
            error: err
          }
        }
        setUpdateResult({ ..._updateResult });
      } else {
        console.log("Name 无变化,不需更新");
      }

      // Do Update IncentivePlan
      if (sliderVal) {
        const partner = sliderVal[0];
        const creator = sliderVal[1] - sliderVal[0];
        const voter = 100 - sliderVal[1];
        const incentivePlanChange = partner != supernodeInfo.incentivePlan.partner
          || creator != supernodeInfo.incentivePlan.creator
          || voter != supernodeInfo.incentivePlan.voter;
        if (incentivePlanChange) {
          try {
            const data = supernodeLoginContract.interface.encodeFunctionData("changeIncentivePlan", [
              supernodeInfo.id, creator, partner, voter
            ]);
            const tx: ethers.providers.TransactionRequest = {
              to: supernodeLoginContract.address,
              data,
              chainId
            };
            const { signedTx, error } = await window.electron.wallet.signTransaction(
              activeAccount,
              provider.connection.url,
              tx
            );
            if (signedTx) {
              const response = await provider.sendTransaction(signedTx);
              const { hash, data } = response;
              addTransaction({ to: supernodeLoginContract.address }, response, {
                call: {
                  from: activeAccount,
                  to: supernodeLoginContract.address,
                  input: data,
                  value: "0"
                }
              });
              _updateResult.incentivePlan = {
                txHash: hash,
                status: 1,
              }
            }
            if (error) {
              _updateResult.incentivePlan = {
                status: 0,
                error: error
              }
            }
          } catch (err: any) {
            console.log("Error >>", err)
            _updateResult.incentivePlan = {
              status: 0,
              error: err
            }
          }
          setUpdateResult({ ..._updateResult });
        } else {
          console.log("Incentive 无变化,不需更新");
        }
      }
      // 执行完毕;
      console.log("执行完毕");
      setUpdating(false);
    }
  }, [activeAccount, updateParams, masternodeStorageContract, supernodeStorageContract, multicallContract, supernodeLoginContract, supernodeInfo, sliderVal]);

  return <>

    <Row style={{ height: "50px" }}>
      <Col span={12}>
        <Button style={{ marginTop: "14px", marginRight: "12px", float: "left" }} size="large" shape="circle" icon={<LeftOutlined />} onClick={() => {
          navigate("/main/supernodes")
        }} />
        <Title level={4} style={{ lineHeight: "16px" }}>
          {t("wallet_supernodes_sync")}
        </Title>
      </Col>
    </Row>

    <Row style={{ marginTop: "20px", width: "100%" }}>
      <Card style={{ width: "100%" }}>
        <div style={{ width: "50%", margin: "auto" }}>

          <Row style={{ marginTop: "20px" }}>
            <Col span={24}>
              <Text type="secondary">{t("wallet_supernodes_id")}</Text>
            </Col>
            <Col>
              <Text strong>{supernodeInfo?.id}</Text>
            </Col>
            <Col span={24} style={{ marginTop: "20px" }}>
              <Text type="secondary">{t("wallet_supernodes_creator")}</Text>
            </Col>
            <Col span={24}>
              {
                supernodeInfo && <AddressComponent address={supernodeInfo?.creator} />
              }
            </Col>
            {
              isNodeCreator && <>
                <Col span={24} style={{ marginTop: "20px" }}>
                  <Text type="secondary">{t("wallet_supernodes_creator")}</Text>
                </Col>
                <Col span={24}>
                  <Input style={{ marginTop: "5px" }} value={updateParams?.address} placeholder='输入超级节点地址'
                    onChange={(event) => {
                      const input = event.target.value.trim();
                      setUpdateParams({
                        ...updateParams,
                        address: input
                      });
                      setInputErrors({
                        ...inputErrors,
                        address: undefined
                      })
                    }} />
                  {
                    inputErrors?.address && <Alert style={{ marginTop: "5px" }} type="error" showIcon message={inputErrors.address} />
                  }
                </Col>
                <Divider />
                <Col span={24}>
                  <Text type="secondary">{t("wallet_supernodes_enode")}</Text>
                </Col>
                <Col span={24}>
                  <Input.TextArea style={{ height: "100px" }} value={updateParams.enode}
                    onChange={(event) => {
                      const input = event.target.value.trim();
                      setUpdateParams({
                        ...updateParams,
                        enode: input
                      });
                      setInputErrors({
                        ...inputErrors,
                        enode: undefined
                      })
                    }} />
                  {
                    inputErrors?.enode && <Alert style={{ marginTop: "5px" }} type="error" showIcon message={inputErrors.enode} />
                  }
                </Col>

                <Divider />
                <Col span={24}>
                  <Text type="secondary">{t("wallet_supernodes_name")}</Text>
                </Col>
                <Col span={24}>
                  <Input value={updateParams.name} onChange={(event) => {
                    const input = event.target.value.trim();
                    setUpdateParams({
                      ...updateParams,
                      name: input
                    });
                    setInputErrors({
                      ...inputErrors,
                      name: undefined
                    })
                  }} />
                  {
                    inputErrors?.name && <Alert style={{ marginTop: "5px" }} type="error" showIcon message={inputErrors.name} />
                  }
                </Col>
                <Divider />
                <Col span={24}>
                  <Text type="secondary">{t("wallet_supernodes_description")}</Text>
                </Col>
                <Col span={24}>
                  <Input.TextArea style={{ height: "100px" }} value={updateParams.description} onChange={(event) => {
                    const input = event.target.value.trim();
                    setUpdateParams({
                      ...updateParams,
                      description: input
                    });
                    setInputErrors({
                      ...inputErrors,
                      description: undefined
                    })
                  }} />
                  {
                    inputErrors?.description && <Alert style={{ marginTop: "5px" }} type="error" showIcon message={inputErrors.description} />
                  }
                </Col>

                {
                  sliderVal && <>
                    <Divider />
                    <Col span={24}>
                      <Text type='secondary'>{t("wallet_supernodes_incentiveplan")}</Text>
                    </Col>
                    <Col span={24}>
                      <Slider style={{ width: "100%" }}
                        range={{ draggableTrack: true }}
                        value={sliderVal}
                        onChange={(result: number[]) => {
                          const left = result[0];
                          const right = result[1];
                          if (left >= 40 && left <= 50 && right >= 50 && right <= 60 && (right - left) <= 10) {
                            setSliderVal(result)
                          }
                        }}
                      />
                      <Row style={{ width: "100%" }}>
                        <Col span={8} style={{ textAlign: "left" }}>
                          <Text strong>{t("wallet_supernodes_incentiveplan_members")}</Text><br />
                          <Text>{sliderVal[0]} %</Text>
                        </Col>
                        <Col span={8} style={{ textAlign: "center" }}>
                          <Text strong>{t("wallet_supernodes_incentiveplan_creator")}</Text><br />
                          <Text>{sliderVal[1] - sliderVal[0]}%</Text>
                        </Col>
                        <Col span={8} style={{ textAlign: "right" }}>
                          <Text strong>{t("wallet_supernodes_incentiveplan_voters")}</Text><br />
                          <Text>{100 - sliderVal[1]} %</Text>
                        </Col>
                      </Row>
                    </Col>
                  </>
                }

              </>
            }
          </Row>
          <Divider />
          <Row>
            <Col span={24}>
              {
                updateResult &&
                <>
                  <Alert style={{ marginTop: "20px", marginBottom: "20px" }} type="success" message={<>
                    {
                      updateResult.address && <>
                        {
                          updateResult.address.status == 1 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_txhash_address")}</Text><br />
                            <Text strong>{updateResult.address.txHash}</Text> <br />
                          </>
                        }
                        {
                          updateResult.address.status == 0 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_error_address")}</Text><br />
                            <Text strong type="danger">
                              <CloseCircleTwoTone twoToneColor="red" style={{ marginRight: "5px" }} />
                              {updateResult.address.error.reason}
                            </Text> <br />
                          </>
                        }
                      </>
                    }
                    {
                      updateResult.enode && <>
                        {
                          updateResult.enode.status == 1 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_txhash_enode")}</Text><br />
                            <Text strong>{updateResult.enode.txHash}</Text> <br />
                          </>
                        }
                        {
                          updateResult.enode.status == 0 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_error_enode")}</Text><br />
                            <Text strong type="danger">
                              <CloseCircleTwoTone twoToneColor="red" style={{ marginRight: "5px" }} />
                              {updateResult.enode.error.reason}
                            </Text> <br />
                          </>
                        }
                      </>
                    }
                    {
                      updateResult.name && <>
                        {
                          updateResult.name.status == 1 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_txhash_name")}</Text><br />
                            <Text strong>{updateResult.name.txHash}</Text> <br />
                          </>
                        }
                        {
                          updateResult.name.status == 0 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_error_name")}</Text><br />
                            <Text strong type="danger">
                              <CloseCircleTwoTone twoToneColor="red" style={{ marginRight: "5px" }} />
                              {updateResult.name.error.reason}
                            </Text> <br />
                          </>
                        }
                      </>
                    }
                    {
                      updateResult.description && <>
                        {
                          updateResult.description.status == 1 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_txhash_description")}</Text><br />
                            <Text strong>{updateResult.description.txHash}</Text> <br />
                          </>
                        }
                        {
                          updateResult.description.status == 0 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_error_description")}</Text><br />
                            <Text strong type="danger">
                              <CloseCircleTwoTone twoToneColor="red" style={{ marginRight: "5px" }} />
                              {updateResult.description.error.reason}
                            </Text> <br />
                          </>
                        }
                      </>
                    }
                    {
                      updateResult.incentivePlan && <>
                        {
                          updateResult.incentivePlan.status == 1 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_txhash_incentivePlan")}</Text><br />
                            <Text strong>{updateResult.incentivePlan.txHash}</Text> <br />
                          </>
                        }
                        {
                          updateResult.incentivePlan.status == 0 && <>
                            <Text type="secondary">{t("wallet_supernodes_sync_error_incentivePlan")}</Text><br />
                            <Text strong type="danger">
                              <CloseCircleTwoTone twoToneColor="red" style={{ marginRight: "5px" }} />
                              {updateResult.incentivePlan.error.reason}
                            </Text> <br />
                          </>
                        }
                      </>
                    }
                    <br />
                    <Text italic>{t("wallet_supernodes_sync_update_tip")}</Text>
                  </>} />
                </>
              }
            </Col>

            <Col span={24} style={{ textAlign: "right" }}>
              {
                isNodeCreator &&
                <Button disabled={!needUpdate || (updateResult != undefined && !updating)} type="primary" onClick={doUpdate} loading={updating}>{t("update")}</Button>
              }
              {
                !isNodeCreator && <>
                  <Alert style={{ marginTop: "5px", textAlign: "left" }} type="warning" showIcon message={t("wallet_node_sync_error")} />
                </>
              }
            </Col>

          </Row>
        </div>
      </Card>
    </Row>

  </>

}

