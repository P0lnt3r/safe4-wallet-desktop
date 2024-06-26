import React, { useCallback, useEffect, useMemo } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Divider, Input, Select, Space, Button, Typography, Row, Col } from 'antd';
import "./comp.css";
import { useNavigate } from 'react-router-dom';
import { useETHBalances, useWalletsActiveWallet, useWalletsList, useWalletsWalletNames } from '../../state/wallets/hooks';
import { useDispatch } from 'react-redux';
import { walletsUpdateActiveWallet, walletsUpdateWalletName } from '../../state/wallets/action';
import { IPC_CHANNEL } from '../../config';
import { WalletNameSignal, WalletName_Methods } from '../../../main/handlers/WalletNameHandler';
import useWalletName from '../../hooks/useWalletName';

const { Text } = Typography;

export default () => {

  const navigate = useNavigate();
  const walletsList = useWalletsList();
  const activeWallet = useWalletsActiveWallet();
  const dispatch = useDispatch();
  const addressesBalances = useETHBalances(walletsList.map(wallet => wallet.address));
  const walletsWalletNames = useWalletsWalletNames();
  const activeWalletName = useWalletName(activeWallet?.address);

  const items = useMemo(() => {
    let items = [];
    for (let i in walletsList) {
      const {
        name, publicKey, address
      } = walletsList[i];
      const balance = addressesBalances[address];
      let _name = name;
      if (walletsWalletNames && walletsWalletNames[address]) {
        _name = walletsWalletNames[address].name;
      }
      items.push({
        label: <>
          <Text style={{ float: "left" }}>{_name}</Text>
          <Text style={{ float: "right", marginLeft: "50px" }}>{balance?.toFixed(0)}</Text>
          <br />
          <Text type='secondary'>{address}</Text>
        </>,
        value: publicKey
      })
    }
    return items;
  }, [walletsList, addressesBalances, walletsWalletNames]);


  const createNewWallet = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    navigate("/selectCreateWallet");
  };

  const switchActionWallet = (publicKey: string, e: any) => {
    dispatch(walletsUpdateActiveWallet(publicKey));
  }

  useEffect(() => {
    if (activeWallet) {
      const activeWalletAddress = walletsList.filter(wallet => wallet.publicKey == activeWallet.publicKey)[0].address;
      if (walletsWalletNames) {
        const walletName = { ... walletsWalletNames[activeWalletAddress] };
        walletName.active = true;
        const method = WalletName_Methods.saveOrUpdate;
        window.electron.ipcRenderer.sendMessage(IPC_CHANNEL, [WalletNameSignal, method, [
          {
            address: activeWalletAddress,
            name: walletName.name,
            active: 1
          }
        ]]);
      }
    }
  }, [activeWallet, walletsList]);


  return <>
    <Select
      className='wallet-switch-selector'
      value={activeWalletName}
      onChange={switchActionWallet}
      style={{ textAlign: "center", marginBottom: "15px", height: "50px", width: "220px", marginLeft: "5px", borderRadius: "20px" }}
      dropdownRender={(menu) => (
        <div>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <Button style={{ width: "100%", height: "60px" }} type="text" icon={<PlusOutlined />} onClick={createNewWallet}>
            创建新的钱包
          </Button>
        </div>
      )}
      options={items}
    />
  </>
}
