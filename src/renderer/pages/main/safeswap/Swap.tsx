import { ArrowDownOutlined, DownOutlined, LeftOutlined, RightOutlined, SwapOutlined, SyncOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Card, Col, Divider, Dropdown, Input, MenuProps, message, Row, Select, Space, Spin, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useWeb3React } from "@web3-react/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChainId, CurrencyAmount, Pair, Percent, Price, Token, TokenAmount, Trade, TradeType } from "@uniswap/sdk";
import { Contract, ethers } from "ethers";
import { useETHBalances, useTokenAllowanceAmounts, useTokenBalances, useWalletsActiveAccount, useWalletsActiveSigner } from "../../../state/wallets/hooks";
import { calculatePairAddress } from "./Calculate";
import { useSafeswapSlippageTolerance, useSafeswapTokens } from "../../../state/application/hooks";
import { useTokens } from "../../../state/transactions/hooks";
import TokenButtonSelect from "./TokenButtonSelect";
import { Safe4NetworkChainId, SafeswapV2RouterAddress, USDT, WSAFE } from "../../../config";
import { IERC20_Interface } from "../../../abis";
import SwapConfirm from "./SwapConfirm";
import { useDispatch } from "react-redux";
import { applicationUpdateSafeswapTokens } from "../../../state/application/action";
import ViewFiexdAmount from "../../../utils/ViewFiexdAmount";
import { useSafeswapV2Pairs } from "./hooks";
import ERC20TokenLogoComponent from "../../components/ERC20TokenLogoComponent";
const { Text, Link } = Typography;

export const SafeswapV2_Fee_Rate = "0.003";
export const SafeswapV2_Default_SlippageTolerance = 0.005;

export enum PriceType {
  A2B = "A2B",
  B2A = "B2A"
}

export const Default_Safeswap_Tokens = (chainId: Safe4NetworkChainId) => {
  return [
    USDT[chainId],
    undefined,
    // new Token(ChainId.MAINNET, "0xC5a68f24aD442801c454417e9F5aE073DD9D92F6", 18, "TKA", "Token-A"),
    // new Token(ChainId.MAINNET, "0xb9FE8cBC71B818035AcCfd621d204BAa57377FFA", 18, "TKB", "Token-B")
  ]
}
export const Default_SlippageTolerance = "0.01"; // 1%

export function parseTokenData(token: any): Token | undefined {
  if (token) {
    return new Token(token.chainId, token.address, token.decimals, token.symbol, token.name);
  }
  return undefined
}
export function SerializeToken(token: Token | undefined): {
  chainId: number, address: string, decimals: number, name?: string, symbol?: string
} | undefined {
  return token ? { ...token } : undefined;
}

export function isDecimalPrecisionExceeded(amount: string, token: Token | undefined): boolean {
  // 将输入的金额字符串转为小数
  const decimalIndex = amount.indexOf(".");
  // 如果没有小数部分，说明小数位数为0
  if (decimalIndex === -1) {
    return false;
  }
  // 获取小数部分
  const decimalPlaces = amount.length - decimalIndex - 1;
  // 判断小数位是否超过代币精度
  return decimalPlaces > (token ? token.decimals : 18);
}

export default ({
  goToAddLiquidity
}: {
  goToAddLiquidity: () => void
}) => {
  const { loading, result } = useSafeswapV2Pairs();
  const pairsMap  = result?.pairsMap;
  const { t } = useTranslation();
  const { chainId } = useWeb3React();
  const signer = useWalletsActiveSigner()
  const activeAccount = useWalletsActiveAccount();
  const dispatch = useDispatch();

  const Default_Swap_Token = chainId && Default_Safeswap_Tokens(chainId);
  const tokens = useTokens();
  const erc20Tokens = useMemo(() => {
    if (chainId) {
      const defaultTokens = [
        USDT[chainId as Safe4NetworkChainId],
        WSAFE[chainId as Safe4NetworkChainId],
      ]
      return defaultTokens.concat(Object.keys(tokens).map((address) => {
        const { name, decimals, symbol } = tokens[address];
        return new Token(ChainId.MAINNET, address, decimals, symbol, name);
      }));
    }
  }, [chainId]);
  const tokenAmounts = erc20Tokens && useTokenBalances(activeAccount, erc20Tokens);
  const tokenAllowanceAmounts = erc20Tokens && useTokenAllowanceAmounts(activeAccount, SafeswapV2RouterAddress, erc20Tokens);
  const balance = useETHBalances([activeAccount])[activeAccount];

  const safeswapTokens = useSafeswapTokens();
  const [tokenA, setTokenA] = useState<Token | undefined>(
    safeswapTokens ? parseTokenData(safeswapTokens.tokenA) : Default_Swap_Token ? Default_Swap_Token[0] : undefined
  );
  const [tokenB, setTokenB] = useState<Token | undefined>(
    safeswapTokens ? parseTokenData(safeswapTokens.tokenB) : Default_Swap_Token ? Default_Swap_Token[1] : undefined
  );

  const pairAddress = chainId && calculatePairAddress(tokenA, tokenB, chainId);
  const pair = (pairsMap && pairAddress) && pairsMap[pairAddress];

  const balanceOfTokenA = tokenAmounts && tokenA ? tokenAmounts[tokenA.address] : balance;
  const balanceOfTokenB = tokenAmounts && tokenB ? tokenAmounts[tokenB.address] : balance;
  const [tokenInAmount, setTokenInAmount] = useState<string>();
  const [tokenOutAmount, setTokenOutAmount] = useState<string>();
  const tokenAContract = tokenA ? new Contract(tokenA.address, IERC20_Interface, signer) : undefined;
  const [openSwapConfirmModal, setOpenSwapConfirmModal] = useState<boolean>(false);

  const [trade, setTrade] = useState<Trade>();
  const liquidityNotFound = (!loading && pair == undefined && trade == undefined);

  const balanceOfTokenANotEnough = useMemo(() => {
    if (tokenInAmount && balanceOfTokenA) {
      return tokenA ? new TokenAmount(tokenA, ethers.utils.parseUnits(tokenInAmount, tokenA.decimals).toBigInt()).greaterThan(balanceOfTokenA)
        : CurrencyAmount.ether(ethers.utils.parseUnits(tokenInAmount).toBigInt()).greaterThan(balanceOfTokenA)
    }
    return false;
  }, [tokenA, balanceOfTokenA, tokenInAmount]);

  const reserverOfTokenBNotEnough = useMemo(() => {
    if (tokenOutAmount && pair && chainId && !trade) {
      const _tokenB = tokenB ? tokenB : WSAFE[chainId as Safe4NetworkChainId];
      const _tokenOutAmount = new TokenAmount(_tokenB, ethers.utils.parseUnits(tokenOutAmount, tokenB?.decimals).toBigInt());
      const _tokenBReserve = pair.token0.equals(_tokenB) ? pair.reserve0 : pair.reserve1;
      return _tokenOutAmount.greaterThan(_tokenBReserve);
    }
  }, [pair, trade, tokenB, tokenOutAmount, chainId]);

  const [approveTokenHash, setApproveTokenHash] = useState<{
    [address: string]: {
      execute: boolean,
      hash?: string
    }
  }>({});

  const allowanceForRouterOfTokenA = useMemo(() => {
    return tokenAllowanceAmounts && tokenA ? tokenAllowanceAmounts[tokenA.address] : undefined;
  }, [tokenA, tokenAllowanceAmounts]);
  const needApproveTokenA = useMemo(() => {
    if (tokenA && tokenInAmount && allowanceForRouterOfTokenA && !balanceOfTokenANotEnough && !liquidityNotFound) {
      const inAmount = new TokenAmount(tokenA, ethers.utils.parseUnits(tokenInAmount, tokenA.decimals).toBigInt());
      return inAmount.greaterThan(allowanceForRouterOfTokenA)
    }
    return false;
  }, [allowanceForRouterOfTokenA, tokenInAmount, balanceOfTokenANotEnough, liquidityNotFound]);

  const approveRouter = useCallback(() => {
    if (tokenA && activeAccount && tokenAContract) {
      setApproveTokenHash({
        ...approveTokenHash,
        [tokenA.address]: {
          execute: true
        }
      })
      tokenAContract.approve(SafeswapV2RouterAddress, ethers.constants.MaxUint256)
        .then((response: any) => {
          const { hash, data } = response;
          setApproveTokenHash({
            ...approveTokenHash,
            [tokenA.address]: {
              hash,
              execute: true
            }
          })
        })
    }
  }, [activeAccount, tokenA, tokenAContract]);

  const calculate = useCallback((tokenInAmount: string | undefined, tokenOutAmount: string | undefined): CurrencyAmount | undefined => {
    if (chainId && pairsMap) {
      const _tokenA = tokenA ? tokenA : WSAFE[chainId as Safe4NetworkChainId];
      const _tokenB = tokenB ? tokenB : WSAFE[chainId as Safe4NetworkChainId];
      const pairs = Object.values(pairsMap);
      if (tokenInAmount) {
        const _tokenInAmount = new TokenAmount(
          _tokenA, ethers.utils.parseUnits(tokenInAmount, _tokenA.decimals).toBigInt()
        );
        const [trade] = Trade.bestTradeExactIn(pairs, _tokenInAmount, _tokenB, {
          maxHops: 3, maxNumResults: 1
        });
        setTrade(trade);
        if (trade) {
          const { outputAmount, route } = trade;
          return outputAmount;
        } else {
          console.log("Not Trade Found In Pairs");
        }
      } else if (tokenOutAmount) {
        const _tokenOutAmount = new TokenAmount(
          _tokenB, ethers.utils.parseUnits(tokenOutAmount, _tokenB.decimals).toBigInt()
        )
        const [trade] = Trade.bestTradeExactOut(pairs, _tokenA, _tokenOutAmount, {
          maxHops: 3, maxNumResults: 1
        });
        setTrade(trade);
        if (trade) {
          const { inputAmount, route } = trade;
          return inputAmount;
        } else {
          console.log("Not Trade Found In Pairs");
        }
      }
    }
    return undefined;
  }, [chainId, tokenA, tokenB, pairsMap]);

  const handleTokenInAmountInput = (_tokenInAmount: string) => {
    const decimalExceeded = isDecimalPrecisionExceeded(_tokenInAmount, tokenA);
    const isValidInput = (_tokenInAmount == '') || Number(_tokenInAmount);
    if (!decimalExceeded && (isValidInput || isValidInput == 0)) {
      setTokenInAmount(_tokenInAmount);
      if (_tokenInAmount && isValidInput != 0) {
        const tokenOutAmount = calculate(_tokenInAmount, undefined);
        setTokenOutAmount(tokenOutAmount && tokenOutAmount.toSignificant());
      } else {
        setTokenOutAmount(undefined);
        setTrade(undefined);
      }
    }
  }

  const handleTokenOutAmountInput = (_tokenOutAmount: string) => {
    const decimalExceeded = isDecimalPrecisionExceeded(_tokenOutAmount, tokenB);
    const isValidInput = (_tokenOutAmount == '') || Number(_tokenOutAmount);
    if (!decimalExceeded && (isValidInput || isValidInput == 0)) {
      setTokenOutAmount(_tokenOutAmount);
      if (_tokenOutAmount && isValidInput != 0) {
        try {
          const tokenInAmount = calculate(undefined, _tokenOutAmount);
          setTokenInAmount(tokenInAmount && tokenInAmount.toSignificant());
        } catch (err) {

        }
      } else {
        setTokenInAmount(undefined);
        setTrade(undefined);
      }
    }
  }

  const reverseSwapFocus = () => {
    const _tokenA = tokenB;
    const _tokenB = tokenA;
    setTokenA(_tokenA);
    setTokenB(_tokenB);
  }

  useEffect(() => {
    dispatch(applicationUpdateSafeswapTokens({
      tokenA: tokenA ? SerializeToken(tokenA) : undefined,
      tokenB: tokenB ? SerializeToken(tokenB) : undefined,
    }));
    setTokenInAmount(undefined);
    setTokenOutAmount(undefined);
    setTrade(undefined);
  }, [tokenA, tokenB]);

  const slippageTolerance = useSafeswapSlippageTolerance();

  const RenderRoutePath = () => {
    return <>
      {
        trade?.route.path && trade.route.path.length > 2 &&
        <Row>
          <Col span={24}>
            <Text type="secondary">交易路由</Text>
          </Col>
          <Col span={24}>
            <Card style={{ marginTop: "10px" }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {
                  trade.route.path.map(token => {
                    const tokenIndex = trade.route.path.indexOf(token);
                    const isLastToken = tokenIndex == trade.route.path.length - 1;
                    return <Space style={{ flex: "1 1" }} key={token.address}>
                      <ERC20TokenLogoComponent style={{ width: "20px", height: "20px", padding: "1px" }} address={token.address} chainId={token.chainId} />
                      <Text ellipsis strong style={{ fontSize: "14px" }}>{token.symbol}</Text>
                      {
                        !isLastToken && <RightOutlined />
                      }
                    </Space>
                  })
                }
              </div>
            </Card>
          </Col>
        </Row>
      }
    </>
  }

  const RenderPrice = () => {
    const price = trade?.executionPrice;
    return <>
      {
        price && <Row style={{ marginTop: "20px" }}>
          <Col span={24}>
            <Text type="secondary">价格</Text>
          </Col>
          <Col span={12}>
            <Col span={24} style={{ textAlign: "center" }}>
              <Text strong>{price.toSignificant(4)}</Text> {tokenB ? tokenB.symbol : "SAFE"}
            </Col>
            <Col span={24} style={{ textAlign: "center" }}>
              <Text>1 {tokenA ? tokenA.symbol : "SAFE"}</Text>
            </Col>
          </Col>
          <Col span={12}>
            <Col span={24} style={{ textAlign: "center" }}>
              <Text strong>{price.invert().toSignificant(4)}</Text> {tokenA ? tokenA.symbol : "SAFE"}
            </Col>
            <Col span={24} style={{ textAlign: "center" }}>
              <Text>1 {tokenB ? tokenB.symbol : "SAFE"}</Text>
            </Col>
          </Col>
        </Row>
      }
    </>
  }

  const RenderSlippageTolerance = () => {
    if (slippageTolerance != SafeswapV2_Default_SlippageTolerance) {
      return <>
        <Row style={{ marginTop: "15px" }}>
          <Col span={12}>
            <Text type="secondary" strong>滑点容差</Text>
          </Col>
          <Col span={12} style={{ textAlign: "right" }}>
            <Text>{slippageTolerance * 100}%</Text>
          </Col>
        </Row>
      </>
    }
    return <></>
  }

  const RenderTradeResult = () => {
    if (trade) {
      const tradeType = trade.tradeType;
      const slippage = new Percent(slippageTolerance * 1000 + "", "1000");
      if (tradeType == TradeType.EXACT_INPUT) {
        return <Row>
          <Col span={6}>
            <Text type="secondary">最少获得</Text>
          </Col>
          <Col span={18} style={{ textAlign: "right" }}>
            <Text strong style={{ marginRight: "5px" }}>
              {trade.minimumAmountOut(slippage).toSignificant()}
            </Text>
            <Text strong>
              {tokenB ? tokenB.symbol : "SAFE"}
            </Text>
          </Col>
        </Row>
      } else if (tradeType == TradeType.EXACT_OUTPUT) {
        return <Row>
          <Col span={6}>
            <Text type="secondary">最多支付</Text>
          </Col>
          <Col span={18} style={{ textAlign: "right" }}>
            <Text strong style={{ marginRight: "5px" }}>
              {trade.maximumAmountIn(slippage).toSignificant()}
            </Text>
            <Text strong>
              {tokenA ? tokenA.symbol : "SAFE"}
            </Text>
          </Col>
        </Row>
      }
    }
  }


  return <>
    <Spin spinning={loading}>
      <Row>
        <Col span={24}>
          <Text type="secondary" strong>{t("wallet_crosschain_select_token")}</Text>
          <Text type="secondary" style={{ float: "right" }}>可用余额:
            {balanceOfTokenA && ViewFiexdAmount(balanceOfTokenA, tokenA, 4)}
          </Text>
        </Col>
        <Col span={16}>
          <Input placeholder="0.0" size="large" style={{ height: "80px", width: "150%", fontSize: "24px" }} value={tokenInAmount}
            onChange={(event) => {
              handleTokenInAmountInput(event.target.value)
            }} />
        </Col>
        <Col span={8}>
          <Row style={{ marginTop: "24px" }}>
            <Col span={4}>
              {/* <div style={{ marginTop: "4px" }}>
              <Link>{t("wallet_send_max")}</Link>
              <Divider type="vertical" />
            </div> */}
            </Col>
            <Col span={20}>
              <div style={{ float: "right", paddingRight: "5px" }}>
                <TokenButtonSelect token={tokenA} tokenSelectCallback={(token: Token | undefined) => {
                  if (tokenB?.address == token?.address) {
                    reverseSwapFocus();
                  } else {
                    setTokenInAmount(undefined);
                    setTokenOutAmount(undefined);
                    setTokenA(token);
                  }
                }} />
              </div>
            </Col>
          </Row>
        </Col>
        {
          balanceOfTokenANotEnough && <Col span={24}>
            <Alert style={{ marginTop: "5px" }} showIcon type="error" message={<>
              账户可用余额不足
            </>} />
          </Col>
        }
      </Row>
      <Row>
        <Col span={24}>
          <ArrowDownOutlined onClick={reverseSwapFocus} style={{ fontSize: "24px", color: "green", marginTop: "10px", marginBottom: "10px" }} />
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Text type="secondary" strong>选择代币</Text>
          <Text type="secondary" style={{ float: "right" }}>可用余额:
            {balanceOfTokenB && ViewFiexdAmount(balanceOfTokenB, tokenB, 4)}
          </Text>
        </Col>
        <Col span={16}>
          <Input placeholder="0.0" size="large" style={{ height: "80px", width: "150%", fontSize: "24px" }} value={tokenOutAmount}
            onChange={(event) => {
              handleTokenOutAmountInput(event.target.value)
            }} />
        </Col>
        <Col span={8}>
          <Row style={{ marginTop: "24px" }}>
            <Col span={4}>

            </Col>
            <Col span={20}>
              <div style={{ float: "right", paddingRight: "5px" }}>
                <TokenButtonSelect token={tokenB} tokenSelectCallback={(token: Token | undefined) => {
                  if (tokenA?.address == token?.address) {
                    reverseSwapFocus();
                  } else {
                    setTokenInAmount(undefined);
                    setTokenOutAmount(undefined);
                    setTokenB(token);
                  }
                }} />
              </div>
            </Col>
          </Row>
        </Col>
        {
          reserverOfTokenBNotEnough && <Col span={24}>
            <Alert style={{ marginTop: "5px" }} showIcon type="error" message={<>
              超过该交易池库存
            </>} />
          </Col>
        }
      </Row>
      {
        RenderPrice()
      }
      <Divider />
      {
        RenderSlippageTolerance()
      }
      {
        RenderTradeResult()
      }
      {
        RenderRoutePath()
      }
      {
        liquidityNotFound && <Row style={{ marginTop: "5px" }}>
          <Col span={24}>
            <Alert style={{ width: "100%" }} type="warning" message={<Row>
              <Col span={24}>
                <Text>未在 Safeswap 中找到该资金池</Text>
                <Link onClick={() => goToAddLiquidity()} style={{ float: "right" }}>
                  添加流动性
                </Link>
              </Col>
            </Row>} />
          </Col>
        </Row>
      }
      {
        needApproveTokenA && tokenA && <Col span={24}>
          <Alert style={{ marginTop: "5px", marginBottom: "10px" }} type="warning" message={<>
            <Text>需要先授权 Safeswap 访问 {tokenA?.symbol}</Text>
            <Link disabled={approveTokenHash[tokenA?.address]?.execute} onClick={approveRouter} style={{ float: "right" }}>
              {
                approveTokenHash[tokenA?.address]?.execute && <SyncOutlined spin />
              }
              {
                approveTokenHash[tokenA?.address] ? "正在授权..." : "点击授权"
              }
            </Link>
          </>} />
        </Col>
      }
      <Divider />
      <Row>
        <Col span={24}>
          <Button disabled={
            (liquidityNotFound || balanceOfTokenANotEnough || reserverOfTokenBNotEnough || needApproveTokenA)
            || (!(tokenInAmount && tokenOutAmount))
          } onClick={() => setOpenSwapConfirmModal(true)} type="primary" style={{ float: "right" }}>{t("next")}</Button>
        </Col>
      </Row>
    </Spin>
    {
      tokenInAmount && tokenOutAmount && trade && <>
        <SwapConfirm openSwapConfirmModal={openSwapConfirmModal} setOpenSwapConfirmModal={setOpenSwapConfirmModal}
          tokenA={tokenA} tokenB={tokenB}
          tokenInAmount={tokenInAmount} tokenOutAmount={tokenOutAmount}
          trade={trade}
        />
      </>
    }
  </>
}
