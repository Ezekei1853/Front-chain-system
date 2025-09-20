import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Select, Upload, message, Typography, Space, Divider, Tabs, Form, InputNumber } from 'antd';
import { UploadOutlined, WalletOutlined, SendOutlined, SearchOutlined } from '@ant-design/icons';
import { ethers } from 'ethers';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

// USDT合约地址 (以太坊主网)
const USDT_CONTRACT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// 简单的数据存储合约ABI
const DATA_STORAGE_ABI = [
  {
    "inputs": [{"name": "_data", "type": "string"}],
    "name": "storeData",
    "outputs": [{"name": "", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_hash", "type": "bytes32"}],
    "name": "getData",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  
  // 方式1: 转账方式状态
  const [transferData, setTransferData] = useState('');
  const [transferAmount, setTransferAmount] = useState('0.001');
  const [targetAddress, setTargetAddress] = useState('');
  
  // 方式2: 读取链上数据状态
  const [searchHash, setSearchHash] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  
  // 方式3: 合约方式状态
  const [contractData, setContractData] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [dataHash, setDataHash] = useState('');

  // 连接钱包
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // 请求账户访问
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // 创建ethers provider和signer
      
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        const ethersSigner = ethersProvider.getSigner();
        
        setProvider(ethersProvider);
        setSigner(ethersSigner);
        
        // 获取账户地址
        const address = await ethersSigner.getAddress();
        setAccount(address);
        
        message.success('钱包连接成功！');
      } catch (error) {
        message.error('钱包连接失败');
        console.error(error);
      }
    } else {
      message.error('请安装MetaMask钱包');
    }
  };

  // 方式1: 转账方式上链
const transferMethod = async () => {
  if (!signer || !account) {
    message.error('请先连接钱包');
    return;
  }

  if (!targetAddress.trim()) {
    message.error('必须输入目标地址');
    return;
  }

  setLoading(true);
  try {
    const dataBytes = ethers.utils.toUtf8Bytes(transferData);
    const hexData = ethers.utils.hexlify(dataBytes);
    console.log(dataBytes,hexData,'datatat')
    
    // 简化的交易对象，让MetaMask自己估算gas
    const tx = {
      to: targetAddress,
      value: ethers.utils.parseEther(transferAmount),
      data: hexData
      // 不设置gasLimit，让MetaMask自动估算
    };

    console.log('发送交易:', tx);
    const transaction = await signer.sendTransaction(tx);
    const receipt = await transaction.wait();
    
    message.success('上链成功!');
    setTransferData('');
  } catch (error) {
    console.error('错误详情:', error);
    message.error('上链失败: ' + error.message);
  } finally {
    setLoading(false);
  }
};
  // 方式2: 使用Infura读取链上数据
  const readChainData = async () => {
    setLoading(true);
    try {
      // 使用Infura provider (替换为你的Infura Project ID)
      const infuraProvider = new ethers.providers.JsonRpcProvider('https://carrot.megaeth.com/rpc')
      
      if (searchHash.startsWith('0x') && searchHash.length === 66) {
        // 查询交易
        console.log(searchHash,'hash')
        const tx = await infuraProvider.getTransaction(searchHash);
        const receipt = await infuraProvider.getTransactionReceipt(searchHash);
        
        if (tx && tx.data && tx.data !== '0x') {
          try {
            // 使用ethers.js解码数据
            const decodedData = ethers.utils.toUtf8String(tx.data);
            setSearchResult({
              type: 'transaction',
              hash: searchHash,
              data: decodedData,
              from: tx.from,
              to: tx.to,
              value: ethers.utils.formatEther(tx.value || 0),
              blockNumber: tx.blockNumber,
              gasUsed: receipt ? receipt.gasUsed.toString() : 'N/A',
              status: receipt ? (receipt.status === 1 ? '成功' : '失败') : 'N/A'
            });
            message.success('数据读取成功！');
          } catch (decodeError) {
            setSearchResult({
              type: 'transaction',
              hash: searchHash,
              data: '无法解码的数据: ' + tx.data,
              from: tx.from,
              to: tx.to,
              value: ethers.utils.formatEther(tx.value || 0),
              blockNumber: tx.blockNumber,
              gasUsed: receipt ? receipt.gasUsed.toString() : 'N/A',
              status: receipt ? (receipt.status === 1 ? '成功' : '失败') : 'N/A'
            });
            message.warning('数据解码失败，但交易信息已获取');
          }
        } else {
          message.warning('该交易不包含数据');
        }
      } else if (searchHash.length === 42 && searchHash.startsWith('0x')) {
        // 查询地址
        const balance = await infuraProvider.getBalance(searchHash);
        const txCount = await infuraProvider.getTransactionCount(searchHash);
        const code = await infuraProvider.getCode(searchHash);
        const isContract = code !== '0x';
        
        setSearchResult({
          type: 'address',
          address: searchHash,
          balance: ethers.utils.formatEther(balance),
          transactionCount: txCount,
          isContract: isContract,
          contractCode: isContract ? '这是一个智能合约地址' : '这是一个普通地址'
        });
        message.success('地址信息读取成功！');
      } else {
        message.error('请输入有效的交易哈希(66字符)或地址(42字符)');
      }
    } catch (error) {
      message.error('读取失败: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 方式3: 通过智能合约存储数据
  const contractMethod = async () => {
    if (!signer || !account) {
      message.error('请先连接钱包');
      return;
    }

    if (!contractAddress.trim()) {
      message.error('请输入合约地址');
      return;
    }

    setLoading(true);
    try {
      // 创建合约实例
      const contract = new ethers.Contract(contractAddress, DATA_STORAGE_ABI, signer);
      
      // 估算gas
      const estimatedGas = await contract.estimateGas.storeData(contractData);
      
      // 调用合约存储数据
      const tx = await contract.storeData(contractData, {
        gasLimit: estimatedGas.mul(120).div(100) // 增加20%的gas缓冲
      });
      
      const receipt = await tx.wait();
      
      // 生成数据哈希ID (使用ethers.js)
      const dataHashId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(contractData));
      setDataHash(dataHashId);
      
      message.success({
        content: (
          <div>
            <div>合约方式存储成功！</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              交易哈希: {receipt.transactionHash}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              区块号: {receipt.blockNumber}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              数据HASH/ID: {dataHashId}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              USDT合约地址: {USDT_CONTRACT_ADDRESS}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Gas使用: {receipt.gasUsed.toString()}
            </div>
          </div>
        ),
        duration: 10
      });
      
      setContractData('');
    } catch (error) {
      message.error('合约存储失败: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 从合约读取数据
  const readFromContract = async () => {
    if (!dataHash || !contractAddress) {
      message.error('请先存储数据获取HASH，或输入要查询的数据HASH');
      return;
    }

    try {
      // 创建只读合约实例
      const infuraProvider = new ethers.providers.JsonRpcProvider('https://carrot.megaeth.com/rpc');
      const contract = new ethers.Contract(contractAddress, DATA_STORAGE_ABI, infuraProvider);
      
      // 读取数据
      const data = await contract.getData(dataHash);
      message.success('合约数据读取成功: ' + data);
    } catch (error) {
      message.error('合约读取失败: ' + error.message);
    }
  };

  return (
 <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Card style={{ borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          
          {/* 标题和钱包连接 */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
              数据上链系统 (Ethers.js版本)
            </Title>
            <Text type="secondary">三种专业的区块链数据存储方案</Text>
          </div>

          {/* 钱包连接状态 */}
          <Card size="small" style={{ backgroundColor: '#f8f9fa', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>钱包状态: </Text>
                {account ? (
                  <Text type="success">已连接 ({account.slice(0, 6)}...{account.slice(-4)})</Text>
                ) : (
                  <Text type="secondary">未连接</Text>
                )}
              </div>
              <Button 
                type="primary" 
                icon={<WalletOutlined />}
                onClick={connectWallet}
                disabled={!!account}
              >
                {account ? '已连接' : '连接钱包'}
              </Button>
            </div>
          </Card>

          {/* 三种方式的Tab */}
          <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
            
            {/* 方式1: 转账方式 */}
            <TabPane tab="转账方式上链" key="1">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Text type="secondary">
                  使用ethers.js将数据编码后通过以太坊转账的data字段存储到区块链上
                </Text>
                
                <Form layout="vertical">
                  <Form.Item label="要上链的数据">
                    <TextArea
                      rows={4}
                      value={transferData}
                      onChange={(e) => setTransferData(e.target.value)}
                      placeholder="输入要上链的数据..."
                      maxLength={1000}
                      showCount
                    />
                  </Form.Item>
                  
                  <Form.Item label="转账金额 (ETH)">
                    <Input
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="0.001"
                      addonAfter="ETH"
                    />
                  </Form.Item>
                  
                  <Form.Item label="目标地址 (可选，留空则转给自己)">
                    <Input
                      value={targetAddress}
                      onChange={(e) => setTargetAddress(e.target.value)}
                      placeholder="0x..."
                    />
                  </Form.Item>
                </Form>
                
                <Button
                  type="primary"
                  size="large"
                  icon={<SendOutlined />}
                  loading={loading}
                  onClick={transferMethod}
                  disabled={!account || !transferData.trim()}
                  style={{ width: '100%' }}
                >
                  转账方式上链
                </Button>
              </Space>
            </TabPane>

            {/* 方式2: 读取方式 */}
            <TabPane tab="读取链上数据" key="2">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Text type="secondary">
                  使用ethers.js + Infura读取链上已存储的数据
                </Text>
                
                <Form layout="vertical">
                  <Form.Item label="交易哈希或地址">
                    <Input
                      value={searchHash}
                      onChange={(e) => setSearchHash(e.target.value)}
                      placeholder="输入交易哈希(0x...66字符)或地址(0x...42字符)进行查询"
                      suffix={
                        <Button 
                          type="link" 
                          icon={<SearchOutlined />}
                          onClick={readChainData}
                          loading={loading}
                        >
                          查询
                        </Button>
                      }
                    />
                  </Form.Item>
                </Form>

                {searchResult && (
                  <Card title="查询结果" style={{ backgroundColor: '#f6ffed' }}>
                    {searchResult.type === 'transaction' ? (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text><strong>类型:</strong> 交易数据</Text>
                        <Text><strong>哈希:</strong> {searchResult.hash}</Text>
                        <Text><strong>发送方:</strong> {searchResult.from}</Text>
                        <Text><strong>接收方:</strong> {searchResult.to}</Text>
                        <Text><strong>金额:</strong> {searchResult.value} ETH</Text>
                        <Text><strong>区块:</strong> {searchResult.blockNumber}</Text>
                        <Text><strong>Gas使用:</strong> {searchResult.gasUsed}</Text>
                        <Text><strong>状态:</strong> {searchResult.status}</Text>
                        <Divider />
                        <Text><strong>数据内容:</strong></Text>
                        <TextArea value={searchResult.data} readOnly rows={3} />
                      </Space>
                    ) : (
                      <Space direction="vertical" size="small">
                        <Text><strong>类型:</strong> 地址信息</Text>
                        <Text><strong>地址:</strong> {searchResult.address}</Text>
                        <Text><strong>余额:</strong> {searchResult.balance} ETH</Text>
                        <Text><strong>交易次数:</strong> {searchResult.transactionCount}</Text>
                        <Text><strong>地址类型:</strong> {searchResult.contractCode}</Text>
                      </Space>
                    )}
                  </Card>
                )}
              </Space>
            </TabPane>

            {/* 方式3: 合约方式 */}
            <TabPane tab="智能合约存储" key="3">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Text type="secondary">
                  通过专门的智能合约存储数据，使用ethers.js生成数据HASH/ID，结合USDT合约地址
                </Text>
                
                <Form layout="vertical">
                  <Form.Item label="合约地址">
                    <Input
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                      placeholder="输入数据存储合约地址..."
                    />
                  </Form.Item>
                  
                  <Form.Item label="要存储的数据">
                    <TextArea
                      rows={4}
                      value={contractData}
                      onChange={(e) => setContractData(e.target.value)}
                      placeholder="输入要通过合约存储的数据..."
                      maxLength={2000}
                      showCount
                    />
                  </Form.Item>
                </Form>

                <Space style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={loading}
                    onClick={contractMethod}
                    disabled={!account || !contractData.trim() || !contractAddress.trim()}
                  >
                    合约存储
                  </Button>
                  
                  <Button
                    type="default"
                    icon={<SearchOutlined />}
                    onClick={readFromContract}
                    disabled={!dataHash || !contractAddress.trim()}
                  >
                    读取数据
                  </Button>
                </Space>

                <Card size="small" style={{ backgroundColor: '#fff7e6' }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text><strong>USDT合约地址:</strong> {USDT_CONTRACT_ADDRESS}</Text>
                    {dataHash && (
                      <div>
                        <Text><strong>数据HASH/ID:</strong></Text>
                        <TextArea value={dataHash} readOnly rows={2} style={{ marginTop: '4px' }} />
                      </div>
                    )}
                  </Space>
                </Card>
              </Space>
            </TabPane>
          </Tabs>

          {/* 使用说明 */}
          <Card title="Ethers.js实现说明" style={{ marginTop: '24px', backgroundColor: '#f0f8ff' }}>
            <Space direction="vertical" size="middle">
              <div>
                <Text strong>1. 转账方式:</Text>
                <Paragraph style={{ marginLeft: '16px', marginBottom: '8px' }}>
                  使用ethers.utils.toUtf8Bytes()将数据转换为字节，然后通过ethers.utils.hexlify()编码为16进制。
                  数据存储在交易的data字段中，永久保存在区块链上。
                </Paragraph>
              </div>
              
              <div>
                <Text strong>2. 读取方式:</Text>
                <Paragraph style={{ marginLeft: '16px', marginBottom: '8px' }}>
                  使用ethers.providers.InfuraProvider连接Infura节点，通过getTransaction()和getTransactionReceipt()
                  获取交易详情，使用ethers.utils.toUtf8String()解码数据。
                </Paragraph>
              </div>
              
              <div>
                <Text strong>3. 合约方式:</Text>
                <Paragraph style={{ marginLeft: '16px', marginBottom: '0' }}>
                  使用ethers.Contract与智能合约交互，通过ethers.utils.keccak256()生成数据哈希。
                  支持estimateGas()估算gas费用，提供更精确的交易控制。
                </Paragraph>
              </div>
              
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fffbe6', borderRadius: '6px' }}>
                <Text strong style={{ color: '#d46b08' }}>重要提示:</Text>
                <Text style={{ marginLeft: '8px' }}>
                  请将代码中的 'YOUR_INFURA_PROJECT_ID' 替换为你的真实Infura项目ID
                </Text>
              </div>
            </Space>
          </Card>

        </Card>
      </div>
    </div>
  );
}

export default App;