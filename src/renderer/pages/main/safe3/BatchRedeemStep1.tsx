import { Alert, Button, Col, Divider, Row, Typography } from "antd"
import { useState } from "react";
import { useSelector } from "react-redux";
import { AppState } from "../../../state";
import path from "path";
import { useTranslation } from "react-i18next";
import { shell } from 'electron';

const { Text, Paragraph } = Typography;

export interface AddressPrivateKeyMap {
  [address: string]: {
    privateKey: string
  }
}

export default ({
  setAddressPrivateKeyMap
}: {
  setAddressPrivateKeyMap: (map: AddressPrivateKeyMap) => void
}) => {

  const { t } = useTranslation();
  const data = useSelector<AppState, { [key: string]: any }>(state => state.application.data);

  const dumpFileName = "safe3.keystores.delete"
  const safe3KeystoresFile_windows = data["data"] + `\\${dumpFileName}`;
  const safe3KeystoresFile = path.join(data["data"], dumpFileName);
  const dumpCommand = `dumpwallet "${safe3KeystoresFile_windows}"`;

  const [loading, setLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string>();

  const loadSafe3PrivateKeyFile = function () {
    setLoading(true);
    window.electron.fileReader.readFile(safe3KeystoresFile)
      .then((fileContent) => {
        try {
          const lines = fileContent.replaceAll("\r", "").split("\n").filter((line: string) => line && line.trim().indexOf("#") != 0)
          const addressPrivateKeyArr = lines.map((line: string) => {
            const arr = line.split(" ");
            const privateKey = arr[0];
            const address = arr[4].split("=")[1];
            return {
              address, privateKey
            }
          });
          const _addressPrivateKeyMap: {
            [address: string]: {
              privateKey: string
            }
          } = {};
          addressPrivateKeyArr.forEach((addressPrivateKey: { address: string, privateKey: string }) => {
            const { address, privateKey } = addressPrivateKey;
            _addressPrivateKeyMap[address] = { privateKey }
          })
          setLoading(false);
          setAddressPrivateKeyMap(_addressPrivateKeyMap)
        } catch (err) {
          setFileError(t("wallet_redeems_batch_safe3keystore_invalid"));
          setLoading(false);
        }
      })
      .catch(err => {
        setFileError(t("wallet_redeems_batch_safe3keystore_notfound"));
        setLoading(false);
      })
  }



  return <>
    <Row style={{ marginTop: "40px" }}>
      <Col span={24}>
        <Text strong>{t("wallet_redeems_batch_step1_substep0")}</Text>
        <br />
        <Text>{t("wallet_redeems_batch_step1_substep0_desc0")},<Text strong>{t("wallet_redeems_batch_step1_substep0_desc1")}</Text></Text>
      </Col>
      <Col span={24} style={{ marginTop: "20px" }}>
        <Text strong>{t("wallet_redeems_batch_step1_substep1")}</Text>
        <br />
        <Text>{t("wallet_redeems_batch_step1_substep1_desc")}</Text>
      </Col>
      <Col span={24} style={{ marginTop: "20px" }}>
        <Text strong>{t("wallet_redeems_batch_step1_substep2")}</Text>
        <br />
        <Text>{t("wallet_redeems_batch_step1_substep2_desc")}</Text>
        <br />
        <Text style={{ float: "left", fontSize: "16px" }} code>{dumpCommand}</Text>
        <Paragraph style={{ float: "left", fontSize: "16px", marginLeft: "5px" }} copyable={{ text: dumpCommand }} />
        <br /><br />
        <Alert type="warning" showIcon message={<>
          无论您是否完成资产迁移，请在
          <Text strong>{data["data"]}</Text> 文件夹中删除
          <Text type="danger" strong>{dumpFileName}</Text>文件,并在回收站中检查是否彻底清理。
        </>} />
      </Col>
      <Col span={24} style={{ marginTop: "20px" }}>
        <Text strong>{t("wallet_redeems_batch_step1_substep3")}</Text>
        <br />
        <Text>{t("wallet_redeems_batch_step1_substep3_desc")}</Text>
      </Col>
    </Row>
    <Divider />
    {
      fileError && <Alert style={{ marginBottom: "10px" }} showIcon type="error" message={fileError} />
    }
    <Button disabled={loading} loading={loading} type="primary" onClick={loadSafe3PrivateKeyFile}>
      {t("wallet_redeems_batch_loadprivatekey")}
    </Button>

  </>

}
