import { Alert, Button, Card, Col, Image, Input, Row, Spin, Typography } from 'antd';
import { useApplicationActionAtCreateWallet, useApplicationBlockchainWeb3Rpc } from './state/application/hooks';
import { useCallback, useEffect, useState } from 'react';
import { Web3ReactHooks, Web3ReactProvider } from '@web3-react/core'
import { initializeConnect } from './connectors/network';
import LoopUpdate from './LoopUpdate';
import { Network } from '@web3-react/network';
import { useDispatch } from 'react-redux';
import { IndexSingal, Index_Methods } from '../main/handlers/IndexSingalHandler';
import config, { IPC_CHANNEL } from './config';
import { applicationDataLoaded, applicationSetPassword, applicationUpdateWeb3Rpc } from './state/application/action';
import { walletsLoadKeystores, walletsLoadWalletNames } from './state/wallets/action';
import SAFE_LOGO from './assets/logo/SAFE.png'
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import MenuComponent from './pages/components/MenuComponent';
import Index from './pages/index';
import SelectCreateWallet from './pages/wallet/SelectCreateWallet';
import SetPassword from './pages/wallet/SetPassword';
import CreateMnemonic from './pages/wallet/create/CreateMnemonic';
import ImportWallet from './pages/wallet/import/ImportWallet';
import WaitingWalletCreate from './pages/wallet/WaitingWalletCreate';
import WaitingWalletImport from './pages/wallet/WaitingWalletImport';
import Wallet from './pages/main/wallets/Wallet';
import Supernodes from './pages/main/supernodes/Supernodes';
import SupernodeVote from './pages/main/supernodes/Vote/SupernodeVote';
import SupernodeAppend from './pages/main/supernodes/Append/SupernodeAppend';
import SupernodeRegister from './pages/main/supernodes/Register/SupernodeRegister';
import Masternodes from './pages/main/masternodes/Masternodes';
import MasternodeRegister from './pages/main/masternodes/Register/MasternodeRegister';
import MasternodeAppend from './pages/main/masternodes/Append/MasternodeAppend';
import Proposals from './pages/main/proposals/Proposals';
import ProposalCreate from './pages/main/proposals/Create/ProposalCreate';
import ProposalVote from './pages/main/proposals/Vote/ProposalVote';
import GetTestCoin from './pages/gettestcoin/GetTestCoin';
import Safe3 from './pages/main/safe3/Safe3';
import Test from './pages/main/tools/Test';
import Menu from './pages/main/menu';
import NetworkPage from './pages/main/menu/network/NetworkPage';
import Storage from './pages/main/menu/storage/Storage';
import Contracts from './pages/main/contracts/Contracts';
import ContractCall from './pages/main/contracts/ContractCall';
import ContractDetail from './pages/main/contracts/ContractDetail';
import ContractDeploy from './pages/main/contracts/ContractDeploy';
import ContractEdit from './pages/main/contracts/ContractEdit';
import { ContractCompileHandler, ContractCompileSignal, ContractCompile_Methods } from '../main/handlers/ContractCompileHandler';
import ModifyPassword from './pages/main/menu/password/ModifyPassword';
import TestSSH2 from './pages/main/tools/TestSSH2';
const CryptoJS = require('crypto-js');
const { Text } = Typography;
export default function App() {

  const dispatch = useDispatch();
  const [loading, setLoading] = useState<boolean>(true);

  const [walletsKeystores, setWalletKeystores] = useState();
  const [encrypt, setEncrypt] = useState<{
    salt: string,
    iv: string,
    ciphertext: string
  }>();
  const [password, setPassword] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();

  const web3Rpc = useApplicationBlockchainWeb3Rpc();
  const [activeWeb3Rpc, setActiveWeb3Rpc] = useState<{
    chainId: number,
    endpoint: string
  } | undefined>();
  const [connectors, setConnectors] = useState<[Network, Web3ReactHooks][] | undefined>();
  const [dbRpcConfigs, setDbRpcConfigs] = useState<{
    chainId: number,
    endpoint: string,
    active: number
  }[]>();

  useEffect(() => {
    if (!loading && dbRpcConfigs) {
      console.log("[App.tsx] load rpc-configs :", dbRpcConfigs);
      const activeRpcConfig = dbRpcConfigs.find(rpcConfig => rpcConfig.active == 1);
      const endpoint = activeRpcConfig ? activeRpcConfig.endpoint : config.Default_Web3_Endpoint;
      const chainId = activeRpcConfig ? activeRpcConfig.chainId : config.Default_Web3_ChainId;
      dispatch(applicationUpdateWeb3Rpc({
        chainId: chainId,
        endpoint: endpoint
      }));
    }
  }, [loading, dbRpcConfigs]);
  useEffect(() => {
    if (web3Rpc) {
      const { chainId, endpoint } = web3Rpc;
      if (chainId && endpoint) {
        if (endpoint != activeWeb3Rpc?.endpoint) {
          const conn = initializeConnect({
            [chainId]: [endpoint]
          })
          setConnectors([
            [conn[0], conn[1]]
          ]);
          setActiveWeb3Rpc({
            chainId,
            endpoint
          })
        }
      }
    }
  }, [web3Rpc]);

  useEffect(() => {
    const method = Index_Methods.load;
    window.electron.ipcRenderer.sendMessage(IPC_CHANNEL, [IndexSingal, 'load', []]);
    window.electron.ipcRenderer.once(IPC_CHANNEL, (arg) => {
      if (arg instanceof Array && arg[0] == IndexSingal && arg[1] == method) {
        const data = arg[2][0];
        const {
          walletKeystores,
          path,
          encrypt,
          rpc_configs,
          wallet_names
        } = data;
        const rpcConfigs = rpc_configs.map((rpc_config: any) => {
          const { id, chain_id, endpoint, active } = rpc_config;
          return {
            chainId: chain_id,
            endpoint,
            active
          }
        });
        const walletNames = wallet_names.map( ( walletName : any ) => {
          const { address , name } = walletName;
          return {
            address ,
            name ,
            active : walletName.active == 1
          }
        })
        setDbRpcConfigs(rpcConfigs);
        dispatch(applicationDataLoaded({
          path, rpcConfigs
        }));
        dispatch(walletsLoadWalletNames(walletNames));
        if (encrypt) {
          setEncrypt(encrypt);
        } else {
          setWalletKeystores(walletKeystores);
        }
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    const method = ContractCompile_Methods.syncSolcLibrary;
    window.electron.ipcRenderer.sendMessage(IPC_CHANNEL, [ContractCompileSignal, method, []]);
  }, []);

  const decrypt = useCallback(() => {
    if (password && encrypt) {
      const salt = CryptoJS.enc.Hex.parse(encrypt.salt);
      const ciphertext = CryptoJS.enc.Hex.parse(encrypt.ciphertext);
      const iv = CryptoJS.enc.Hex.parse(encrypt.iv);
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1024,
        hasher: CryptoJS.algo.SHA256
      });
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext },
        key,
        { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );
      try {
        const text = decrypted.toString(CryptoJS.enc.Utf8);
        const walletKeystores = JSON.parse(text);
        setWalletKeystores(walletKeystores);
        dispatch(applicationSetPassword(password));
      } catch (err) {
        console.log("decrypt error:", err);
        setPasswordError("输入正确的密码才能打开本地加密文件");
      }
    }
  }, [password, encrypt]);

  useEffect(() => {
    if (walletsKeystores) {
      dispatch(walletsLoadKeystores(walletsKeystores));
    }
  }, [walletsKeystores]);
  const atCreateWallet = useApplicationActionAtCreateWallet();

  return (
    <>
      {
        loading && <Spin fullscreen spinning={loading} />
      }
      {
        !loading && !walletsKeystores && encrypt && <>
          <Row style={{ marginTop: "10%" }}>
            <Card style={{ width: "400px", margin: "auto", boxShadow: "5px 5px 10px #888888" }}>
              <Row>
                <Col span={24} style={{ textAlign: "center" }}>
                  <Image preview={false} style={{ marginTop: "10px", width: "80%" }} src={SAFE_LOGO} />
                </Col>
                <Col span={24} style={{ textAlign: "center", marginTop: "10px" }}>
                  <Text style={{ fontSize: "28px" }}>Safe4</Text>
                </Col>
                <Col span={24} style={{ textAlign: "center", marginTop: "10px" }}>
                  <Text type='secondary' style={{ fontSize: "18px" }}>即将进入去中心化网络</Text>
                </Col>
                <Col span={24} style={{ marginTop: "20px" }}>
                  <Input.Password size='large' onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordError(undefined);
                  }} placeholder='输入密码' />
                  {
                    passwordError && <>
                      <Alert style={{ marginTop: "5px" }} type='error' showIcon message={passwordError} />
                    </>
                  }
                </Col>
                <Button disabled={password ? false : true} onClick={decrypt} type='primary' size='large' style={{ width: "100%", marginTop: "20px" }}>
                  解锁
                </Button>
              </Row>
            </Card>
          </Row>
        </>
      }
      {
        !loading && walletsKeystores && connectors && <>
          <Web3ReactProvider key={activeWeb3Rpc?.endpoint} connectors={connectors}>
            <LoopUpdate />
            <Router>
              <Row style={{
              }}>
                {
                  !atCreateWallet && <Col span={6} style={{
                    position: "fixed",
                    width: "230px"
                  }}>
                    <MenuComponent />
                  </Col>
                }
                <Col id='appContainer' span={18} style={{
                  minWidth: "1200px",
                  overflowX: "auto",
                  overflowY: "auto",
                  top: "-10px",
                  right: "0",
                  bottom: "0",
                  left: "235px",
                  paddingLeft: "20px",
                  paddingBottom: "20px",
                }}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/selectCreateWallet" element={<SelectCreateWallet />} />
                    <Route path="/setPassword" element={<SetPassword />} />
                    <Route path="/wallet/createMnemonic" element={<CreateMnemonic />} />
                    <Route path="/wallet/importWallet" element={<ImportWallet />} />
                    <Route path="/waitingCreateWallet" element={<WaitingWalletCreate />} />
                    <Route path="/waitingImportWallet" element={<WaitingWalletImport />} />
                    <Route path="/main/wallet" element={<Wallet />} />
                    <Route path="/main/supernodes" element={<Supernodes />} />
                    <Route path="/main/supernodes/vote" element={<SupernodeVote />} />
                    <Route path="/main/supernodes/append" element={<SupernodeAppend />} />
                    <Route path="/main/supernodes/create" element={<SupernodeRegister />} />
                    <Route path="/main/masternodes" element={<Masternodes />} />
                    <Route path="/main/masternodes/register" element={<MasternodeRegister />} />
                    <Route path="/main/masternodes/append" element={<MasternodeAppend />} />
                    <Route path="/main/proposals" element={<Proposals />} />
                    <Route path="/main/proposals/create" element={<ProposalCreate />} />
                    <Route path="/main/proposals/vote" element={<ProposalVote />} />
                    <Route path="/main/gettestcoin" element={<GetTestCoin />} />
                    <Route path="/main/safe3" element={<Safe3 />} />
                    <Route path="/main/test" element={<TestSSH2 />} />
                    <Route path="/main/menu" element={<Menu />} />
                    <Route path="/main/menu/storage" element={<Storage />} />
                    <Route path="/main/menu/network" element={<NetworkPage />} />
                    <Route path="/main/menu/modifyPassword" element={<ModifyPassword />} />
                    <Route path="/main/contracts" element={<Contracts />} />
                    <Route path="/main/contracts/detail" element={<ContractDetail />} />
                    <Route path="/main/contracts/deploy" element={<ContractDeploy />} />
                    <Route path="/main/contracts/edit" element={<ContractEdit />} />
                  </Routes>
                </Col>
              </Row>
            </Router>
          </Web3ReactProvider>
        </>
      }
    </>
  );
}
