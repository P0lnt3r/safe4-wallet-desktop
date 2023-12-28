
import { Typography, Button, Card, Divider, Statistic, Row, Col, Modal, Flex, Tooltip, Tabs, TabsProps, QRCode } from 'antd';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useWalletsActiveWallet } from '../../../state/wallets/hooks';
import { Application_Action_Update_AtCreateWallet } from '../../../state/application/action';
import { SearchOutlined, SendOutlined, QrcodeOutlined } from '@ant-design/icons';
const { Web3 } = require('web3');

const { Title, Text, Paragraph } = Typography;

export default () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const activeWallet = useWalletsActiveWallet();

  const [openReceiveModal, setOpenReceiveModal] = useState<boolean>(false);

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: '代币',
      children: '代币列表',
    },
    {
      key: '2',
      label: 'NFT',
      children: 'NFT 列表',
    },
    {
      key: '3',
      label: '历史',
      children: '交易记录',
    },
  ];


  async function callDoNewAccount() {
    navigate("/selectCreateWallet");
  }

  const onChange = (key: string) => {
    console.log(key);
  };

  useEffect(() => {
    dispatch(Application_Action_Update_AtCreateWallet(false));
    const web3 = new Web3("ws://47.107.47.210:8546");
    // 订阅新区块事件
    const subscription = web3.eth.subscribe('newBlockHeaders', (error : any, result : any) => {
      if (error) {
        console.error('Error:', error);
      } else {
        console.log('New Block Height:', result.number);
      }
    });
    console.log(subscription)
    // web3.eth.getBlockNumber().then( (data : any) => {
    //   console.log(data)
    // } )
    // console.log(web3.eth)
    // // 记得处理错误和在适当的时候取消订阅
    // subscription.on('error', (error : any) => {
    //   console.error('Subscription Error:', error);
    // });
    // console.log(subscription)

  }, []);

  return (<>

    <Row style={{ height: "50px" }}>
      <Col span={12}>
        <Title level={4} style={{ lineHeight: "16px" }}>钱包:{activeWallet?.name}</Title>
      </Col>
      <Col span={12} style={{ textAlign: "right" }}>

      </Col>
    </Row>
    <div style={{ width: "100%", paddingTop: "40px" }}>
      <div style={{ margin: "auto", width: "90%" }}>

        <Row>
          <Paragraph copyable>{activeWallet?.address}</Paragraph>
        </Row>

        <Row>
          <Col span={20}>
            <Statistic title="余额" value={112893.432135} />
          </Col>
          <Col span={4}>
            <Row>
              <Col span={12} style={{ textAlign: "center" }}>
                <Button style={{
                  height: "45px", width: "45px"
                }} size='large' shape="circle" icon={<SendOutlined />} /><br />
                <Text>发送</Text>
              </Col>
              <Col span={12} style={{ textAlign: "center" }}>
                <Button style={{
                  height: "45px", width: "45px"
                }} size='large' shape="circle" icon={<QrcodeOutlined />} onClick={() => setOpenReceiveModal(true)} /><br />
                <Text>接收</Text>
              </Col>
            </Row>
          </Col>
        </Row>

        <Row style={{ marginTop: "50px" }}>
          <Tabs style={{ width: "100%" }} defaultActiveKey="1" items={items} onChange={onChange} />
        </Row>

      </div>
    </div>

    <Modal title="接收" open={openReceiveModal} width={"400px"} footer={null} closable onCancel={() => { setOpenReceiveModal(false) }}>
      <Divider />
      <Row>
        <Text style={{ margin: "auto", marginTop: "20px", marginBottom: "20px" }} type='secondary'>资产只能在相同的网络中发送。</Text>
      </Row>
      <Row style={{ textAlign: "center" }}>
        {
          activeWallet && <QRCode size={200} style={{ margin: "auto", boxShadow: "5px 5px 10px 2px rgba(0, 0, 0, 0.2)" }} value={activeWallet.address} />
        }
      </Row>
      <Row style={{ width: "200px", textAlign: "center", margin: "auto" }}>
        <Text style={{ margin: "auto", marginTop: "20px", marginBottom: "20px" }} strong>
          {activeWallet?.address}
        </Text>
        <br />
      </Row>
    </Modal>

  </>)

}