import React, { useState, useRef } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Divider, Input, Select, Space, Button } from 'antd';
import type { InputRef } from 'antd';
import "./comp.css";
import { useNavigate } from 'react-router-dom';


let index = 0;

export default () => {

    const [items, setItems] = useState(['Wallet-1', 'Wallet-2']);
    const [name, setName] = useState('');
    const inputRef = useRef<InputRef>(null);
    const navigate = useNavigate();
    const createNewWallet = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
        navigate("/selectCreateWallet");
    };

    return <>
        <Select
            className='wallet-switch-selector'
            style={{ textAlign: "center", marginBottom: "15px", height: "50px", width: "290px", marginLeft: "5px", borderRadius: "20px" }}
            placeholder="Wallet-1"
            dropdownRender={(menu) => (
                <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Button style={{ width: "100%" , height:"60px" }} type="text" icon={<PlusOutlined />} onClick={createNewWallet}>
                        创建新的钱包
                    </Button>
                </>
            )}
            options={items.map((item) => ({ label: <span>{item}</span>, value: item }))}
        />
    </>
}