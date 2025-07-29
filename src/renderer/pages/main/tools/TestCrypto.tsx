import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Col, Divider, Input, Radio, Row, Select, Space, Spin, Typography } from "antd";
import { useApplicationPassword } from "../../../state/application/hooks";
import { ethers } from "ethers";

const { Text, Title } = Typography


export default () => {

  return <>
    <Row style={{ height: "50px" }}>
      <Col span={12}>
        <Title level={4} style={{ lineHeight: "16px" }}>
          Test
        </Title>
      </Col>
    </Row>
    <Row style={{ marginTop: "20px", width: "100%" }}>
      <Card style={{ width: "100%", height: "800px" }}>

      </Card>
    </Row>
  </>

}

