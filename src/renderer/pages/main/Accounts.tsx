
import { Typography, Button, Card, Divider, Statistic, Row, Col, Modal } from 'antd';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Application_Action_Update_AtCreateWallet } from '../../state/application/action';
import { useWalletsActiveWallet } from '../../state/wallets/hooks';

const { Title } = Typography;

export default () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const activeWallet = useWalletsActiveWallet();
  console.log("active wallet !! >" , activeWallet)

  async function callDoNewAccount() {
    navigate("/selectCreateWallet");
  }

  useEffect(() => {
    dispatch( Application_Action_Update_AtCreateWallet(false) );
  }, [])

  return (<>
    <Title level={4} style={{ marginTop: "0px" }}>Accounts - {activeWallet?.name}</Title>
    {
      JSON.stringify(activeWallet)
    }
    <br />
    <Divider />
    <Row>
      <Col span={24}>
        <Statistic title="Total Safe Value Amount" value={112893} />
      </Col>
    </Row>
    <br />
    <br />
    <Row>
      <Col span={6}>
        <Statistic title="Balance" value={112893} precision={2} />
      </Col>
      <Col span={6}>
        <Statistic title="Avaiable" value={112893} precision={2} />
      </Col>
      <Col span={6}>
        <Statistic title="Locked" value={112893} precision={2} />
      </Col>
      <Col span={6}>
        <Statistic title="Used" value={112893} precision={2} />
      </Col>
    </Row>
    <br />
    <br />

  </>)

}
