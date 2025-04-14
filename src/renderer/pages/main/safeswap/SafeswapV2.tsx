import { Alert, Avatar, Button, Card, Col, Divider, Dropdown, Flex, Input, InputNumber, MenuProps, message, Popover, Row, Select, Space, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

import Swap from "./Swap";
import AssetPool, { AssetPoolModule } from "./AssetPool";
import { SettingFilled, SettingOutlined } from "@ant-design/icons";
import SlippageSetting from "./SlippageSetting";
import { useSafeswapV2Pairs } from "./hooks";
import { useTranslation } from "react-i18next";
const { Title, Text, Link } = Typography;

const enum ActiveModule {
  Swap = "Swap",
  AssetsPool = "AssetsPool"
}

export default () => {

  const { t } = useTranslation();
  const [activeModule, setActiveModule] = useState<ActiveModule>(ActiveModule.AssetsPool);
  const [_assetPoolModule, set_AssetPoolModule] = useState<AssetPoolModule>();
  const goToAddLiquidity = () => {
    set_AssetPoolModule(AssetPoolModule.Add);
    setActiveModule(ActiveModule.AssetsPool);
  }

  const safeswapV2Pairs = useSafeswapV2Pairs();

  return <>
    <Row style={{ height: "50px" }}>
      <Col span={8}>
        <Title level={4} style={{ lineHeight: "16px", float: "left" }}>
          {t("wallet_safeswap")}
        </Title>
      </Col>
    </Row>
    <div style={{ width: "100%", paddingTop: "40px" }}>
      <div style={{ margin: "auto", width: "90%" }}>
        <Card style={{ marginBottom: "20px" }}>
          <Row style={{ marginBottom: "20px" }}>
            <div style={{ width: "50%", margin: "auto" }}>
              <Alert style={{ margin: "auto" }} type="info" message={<>
                {t("wallet_safeswap_swap_tip0")}
              </>}></Alert>
            </div>
          </Row>
          <Divider />
          <Card style={{ width: "50%", margin: "auto" }}>
            <Row style={{ marginBottom: "20px" }}>
              <Col span={12} style={{ textAlign: "center" }}>
                <Button onClick={() => setActiveModule(ActiveModule.Swap)}
                  style={{ fontSize: "28px", height: "60px", color: activeModule == ActiveModule.Swap ? "black" : "#b9a4a4" }} type="text">
                  {t("wallet_safeswap_swap")}
                </Button>
              </Col>
              <Col span={12} style={{ textAlign: "center" }}>
                <Button onClick={() => setActiveModule(ActiveModule.AssetsPool)}
                  style={{ fontSize: "28px", height: "60px", color: activeModule == ActiveModule.AssetsPool ? "black" : "#b9a4a4" }} type="text">
                  {t("wallet_safeswap_liquiditypool")}
                </Button>
                <Popover placement="rightTop" content={<>
                  <div style={{ width: "300px" }}>
                    <SlippageSetting />
                  </div>
                </>} title={t("wallet_safeswap_settings")} trigger="click">
                  <SettingOutlined style={{ float: "right" }} />
                </Popover>
              </Col>
            </Row>
            {
              activeModule == ActiveModule.Swap && <Swap safeswapV2Pairs={safeswapV2Pairs} goToAddLiquidity={goToAddLiquidity} />
            }
            {
              activeModule == ActiveModule.AssetsPool && <AssetPool
                safeswapV2Pairs={safeswapV2Pairs}
                _assetPoolModule={_assetPoolModule} />
            }
          </Card>
        </Card>
      </div>
    </div>
  </>
}
