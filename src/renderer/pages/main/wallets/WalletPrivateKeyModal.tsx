

import { Typography, Button, Divider, Statistic, Row, Col, Modal, Tabs, TabsProps, QRCode, Badge, Dropdown, Input, Spin, Alert } from 'antd';
import { useETHBalances, useWalletsActiveAccount, useWalletsActiveKeystore, useWalletsActivePrivateKey, useWalletsActiveSigner, useWalletsActiveWallet } from '../../../state/wallets/hooks';
import { useTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import { useApplicationPassword } from '../../../state/application/hooks';


const { Title, Text, Paragraph } = Typography;

const STEP_0_WARNING = 0;
const STEP_1_CONFIRMPWD = 1;
const STEP_2_SHOW = 2;

export default ({
  openPrivateKeyModal, setOpenPrivateKeyModal
}: {
  openPrivateKeyModal: boolean,
  setOpenPrivateKeyModal: (openPrivateKeyModal: boolean) => void
}) => {

  const { t } = useTranslation();
  const privateKey = useWalletsActivePrivateKey();

  const [currentStep, setCurrentStep] = useState<number>(STEP_0_WARNING);
  const walletPassword = useApplicationPassword();
  const [inputPWD, setInputPWD] = useState<string>();
  const [PWDError, setPWDError] = useState<string>();

  const validateWalletPassword = useCallback(() => {
    if (inputPWD == walletPassword) {
      setPWDError(undefined);
      setCurrentStep(STEP_2_SHOW);
    } else {
      setPWDError(t("wallet_password_error"));
    }
  }, [walletPassword, inputPWD]);

  return (<>
    <Modal title={t("wallet_privateKey")} open={openPrivateKeyModal} width={"400px"} footer={null} closable onCancel={() => {
      setCurrentStep(STEP_0_WARNING);
      setOpenPrivateKeyModal(false);
    }}>
      <Divider />

      {
        currentStep == STEP_0_WARNING && <>
          <Row>
            <Col span={24}>
              <Alert type="warning" showIcon message={<>
                <Text style={{ fontSize: "18px" }}>
                  {t("wallet_querysecret_privateKey_tip")}
                </Text>
              </>} />
            </Col>
            <Col span={24} style={{ marginTop: "20px" }}>
              <Button onClick={() => setCurrentStep(STEP_1_CONFIRMPWD)} size='large' type='primary' style={{ width: "100%" }}>
                {t("wallet_querysecret_confirm_safety")}
              </Button>
            </Col>
          </Row>
        </>
      }

      {
        currentStep == STEP_1_CONFIRMPWD && <>
          <Row>
            <Col span={24}>
              <Alert type="warning" showIcon message={<>
                <Text style={{ fontSize: "18px" }}>
                  {t("wallet_querysecret_privateKey_tip")}
                </Text>
              </>} />
            </Col>
            <Col span={24} style={{ marginTop: "20px" }}>
              <Input.Password placeholder={t("wallet_password_input")} size='large' onChange={(event) => {
                const inputPWD = event.target.value;
                setInputPWD(inputPWD);
                setPWDError(undefined);
              }} />
              {
                PWDError && <Alert style={{ marginTop: "5px" }} showIcon type='error' message={PWDError} />
              }
            </Col>
            <Col span={24} style={{ marginTop: "20px" }}>
              <Button onClick={validateWalletPassword} size='large' type='primary' style={{ width: "100%" }}>
                {t("wallet_querysecret_privateKey_show")}
              </Button>
            </Col>
          </Row>
        </>
      }
      {
        currentStep == STEP_2_SHOW && <>
          <Row>
            <Text strong style={{ margin: "auto", marginTop: "20px", marginBottom: "20px" }} type='danger'>
              {t("wallet_querysecret_privateKey_tip1")}
            </Text>
          </Row>
          <Row style={{ width: "300px", textAlign: "center", margin: "auto" }}>
            <Text style={{ margin: "auto", marginTop: "20px", marginBottom: "20px" }} strong>
              {privateKey && privateKey.replace("0x", "")}
            </Text>
            <br />
          </Row>
        </>
      }
    </Modal>
  </>)

}
