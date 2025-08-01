import { LoadingOutlined, SendOutlined, SyncOutlined } from "@ant-design/icons";
import { TokenAmount } from "@uniswap/sdk";
import { useWeb3React } from "@web3-react/core";
import { Alert, Avatar, Button, Col, Divider, Modal, Row, Typography } from "antd"
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNetworkLogo, NetworkType, outputNetworkCoin } from "../../../../assets/logo/NetworkLogo";
import { Application_Crosschain_Pool_BSC, Application_Crosschain_Pool_ETH, Application_Crosschain_Pool_MATIC, Safe4NetworkChainId, USDT } from "../../../../config";
import { useCrosschainContract, useIERC20Contract } from "../../../../hooks/useContracts";
import { useTokenAllowance, useWalletsActiveAccount } from "../../../../state/wallets/hooks";
import ERC20TokenLogoComponent from "../../../components/ERC20TokenLogoComponent";
import TokenLogo from "../../../components/TokenLogo";
import { ethers } from "ethers";
import { useTransactionAdder } from "../../../../state/transactions/hooks";
import useTransactionResponseRender from "../../../components/useTransactionResponseRender";
import { EmptyContract } from "../../../../constants/SystemContracts";
import { useDispatch } from "react-redux";
import { applicationUpdateWalletTab } from "../../../../state/application/action";
import { useNavigate } from "react-router-dom";

const { Text, Link } = Typography;


export default ({
  token, amount, targetNetwork, targetAddress,
  openCrosschainConfirmModal, setOpenCrosschainConfirmModal
}: {
  token: string,
  amount: string,
  targetNetwork: NetworkType,
  targetAddress: string,
  openCrosschainConfirmModal: boolean,
  setOpenCrosschainConfirmModal: (openCrosschainConfirmModal: boolean) => void,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { chainId, provider } = useWeb3React();
  const activeAccount = useWalletsActiveAccount();
  const addTransaction = useTransactionAdder();
  const {
    render,
    setTransactionResponse,
    setErr,
    response,
    err
  } = useTransactionResponseRender();
  const [sending, setSending] = useState<boolean>(false);
  const Token_USDT = (chainId && chainId in Safe4NetworkChainId) && USDT[chainId as Safe4NetworkChainId];
  const Contract_USDT = Token_USDT && useIERC20Contract(Token_USDT.address, true);
  const CrossChain_Contract = useCrosschainContract();
  const callAllowance = Token_USDT && CrossChain_Contract ? useTokenAllowance(Token_USDT, activeAccount, CrossChain_Contract?.address) : undefined;

  const [txHash, setTxHash] = useState<string>();
  const cancel = useCallback(() => {
    setOpenCrosschainConfirmModal(false);
    if (txHash) {
      setTxHash(undefined);
      dispatch(applicationUpdateWalletTab("history"));
      navigate("/main/wallet");
    }
  }, [txHash])

  const allowance = useMemo(() => {
    if (Token_USDT && token == Token_USDT?.name) {
      if (callAllowance) {
        const _amount = new TokenAmount(Token_USDT, amount);
        return {
          value: callAllowance,
          needApprove: _amount.greaterThan(callAllowance),
        }
      }
      return {
        value: undefined,
        needApprove: true,
      }
    }
    return {
      value: undefined,
      needApprove: false,
    }
  }, [token, amount, Token_USDT, callAllowance]);

  const [approve, setApprove] = useState<{
    hash?: string,
    executing?: boolean
  }>({
    hash: undefined,
    executing: false
  });

  const doApproveMAX = useCallback(() => {
    if (Contract_USDT && CrossChain_Contract) {
      setApprove({
        hash: undefined,
        executing: true
      })
      Contract_USDT.approve(CrossChain_Contract.address, ethers.constants.MaxUint256)
        .then((response: any) => {
          const { hash, data } = response;
          setApprove({
            hash,
            executing: true
          })
        })
    }
  }, [Contract_USDT, CrossChain_Contract]);

  const doCrosschain = useCallback(async () => {
    if (CrossChain_Contract && Token_USDT && Token_USDT.name == token) {
      const value = ethers.utils.parseUnits(amount, Token_USDT.decimals).toString();
      setSending(true);
      CrossChain_Contract.eth2safe(value, targetAddress)
        .then((response: any) => {
          const { hash, data } = response;
          setTransactionResponse(response);
          addTransaction({ to: CrossChain_Contract.address }, response, {
            call: {
              from: activeAccount,
              to: CrossChain_Contract.address,
              input: data,
              value: "0",
              tokenTransfer: {
                from: activeAccount,
                to: EmptyContract.EMPTY,
                value,
                token: {
                  address: Token_USDT.address,
                  name: Token_USDT.name ? Token_USDT.name : "",
                  symbol: Token_USDT.symbol ? Token_USDT.symbol : "",
                  decimals: Token_USDT.decimals
                }
              }
            }
          });
          setTxHash(hash);
        }).catch((err: any) => {
          setSending(false);
          setErr(err)
        })
    } else if (token == 'SAFE') {
      if (chainId && provider) {
        let poolAddress = undefined;
        switch (targetNetwork) {
          case NetworkType.BSC:
            poolAddress = Application_Crosschain_Pool_BSC[chainId as Safe4NetworkChainId];
            break;
          case NetworkType.ETH:
            poolAddress = Application_Crosschain_Pool_ETH[chainId as Safe4NetworkChainId];
            break;
          case NetworkType.MATIC:
            poolAddress = Application_Crosschain_Pool_MATIC[chainId as Safe4NetworkChainId];
            break;
        }
        if (poolAddress) {
          setSending(true);
          const prefix = outputNetworkCoin(targetNetwork) + ":";
          const extraData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(prefix + targetAddress));
          const value = ethers.utils.parseEther(amount);
          const tx: ethers.providers.TransactionRequest = {
            to: poolAddress,
            data: extraData,
            value,
            chainId
          };
          const { signedTx, error } = await window.electron.wallet.signTransaction(
            activeAccount,
            provider.connection.url,
            tx
          );
          if (error) {
            setErr(error)
          }
          if (signedTx) {
            try {
              const response = await provider.sendTransaction(signedTx);
              const { hash, data } = response;
              setTransactionResponse(response);
              addTransaction(tx, response, {
                call: {
                  from: activeAccount,
                  to: poolAddress,
                  input: data,
                  value: value.toString()
                }
              });
              setTxHash(hash);
            } catch (err) {
              setErr(err)
            }
          }
          setSending(false);
        }
      }
    }
  }, [Token_USDT, CrossChain_Contract, chainId])

  return <Modal footer={null} destroyOnClose title={t("wallet_crosschain")} open={openCrosschainConfirmModal} onCancel={cancel}>
    <Divider />
    {
      render
    }
    <Row>
      <Col span={24}>
        <SyncOutlined style={{ fontSize: "32px" }} />
        <Text style={{ fontSize: "32px", marginLeft: "5px" }} strong>{amount} {token}</Text>
      </Col>
    </Row>
    <br />
    <Row>
      <Col span={24}>
        <Text type="secondary">{t("wallet_send_from")}</Text>
      </Col>
      <Col span={24} style={{ paddingLeft: "5px" }} >
        <Row>
          <Col span={3} style={{ paddingTop: "5px" }}>
            {
              chainId && Token_USDT && token == Token_USDT?.name && Token_USDT &&
              <ERC20TokenLogoComponent style={{ width: "40px", height: "40px" }} chainId={chainId} address={Token_USDT.address} />
            }
            {
              chainId && token == "SAFE" &&
              <TokenLogo width="40px" height="40px" />
            }
          </Col>
          <Col span={21}>
            <Text strong>Safe4</Text>
            <br />
            <Text strong>{activeAccount}</Text>
          </Col>
        </Row>
      </Col>
    </Row>
    <br />
    <Row>
      <Col span={24}>
        <Text type="secondary">{t("wallet_crosschain_crossto")}</Text>
      </Col>
      <Col span={24} style={{ paddingLeft: "5px" }} >
        <Row>
          <Col span={3} style={{ paddingTop: "5px" }}>
            <Avatar src={getNetworkLogo(targetNetwork)} style={{ width: "40px", height: "40px" }} />
          </Col>
          <Col span={21}>
            <Text strong>{targetNetwork}</Text>
            <br />
            <Text strong>{targetAddress}</Text>
          </Col>
        </Row>
      </Col>
    </Row>
    {
      token == "USDT" && allowance && allowance.needApprove && <>
        <Divider />
        <Row>
          {callAllowance && callAllowance.toExact()}
          <Col span={24}>
            <Alert type="info" message={<Row>
              <Col span={24}>
                <Text>{t("wallet_crosschain_approvetip0")}</Text>
                <Link disabled={approve.executing} onClick={doApproveMAX} style={{ float: "right" }}>
                  {
                    !approve.executing && t("wallet_crosschain_clicktoapprove")
                  }
                  {
                    approve.executing && <>
                      <LoadingOutlined /> {t("wallet_crosschain_approving")}...
                    </>
                  }
                </Link>
              </Col>
            </Row>} />
          </Col>
        </Row>
      </>
    }
    <Divider />
    <Row>
      <Col span={24}>
        {
          !sending && !render && <Button icon={<SendOutlined />} onClick={() => {
            doCrosschain();
          }} disabled={sending || (allowance && allowance.needApprove)} type="primary" style={{ float: "right" }}>
            {t("wallet_send_status_broadcast")}
          </Button>
        }
        {
          sending && !render && <Button loading disabled type="primary" style={{ float: "right" }}>
            {t("wallet_send_status_sending")}
          </Button>
        }
        {
          render && <Button onClick={cancel} type="primary" style={{ float: "right" }}>
            {t("wallet_send_status_close")}
          </Button>
        }
      </Col>
    </Row>
  </Modal>
}
