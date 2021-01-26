import React, { useEffect, useState } from 'react';
import * as bitcoin from 'bitcoinjs-lib';
import {  TXRef,WalletInfoResponse} from "./types";
import './App.css';

const API = 'https://api.blockcypher.com/v1/btc/test3';
const network = bitcoin.networks.testnet;
let privateKey = localStorage.getItem('privateKey');
let keypair = bitcoin.ECPair.makeRandom({ network });

if (privateKey) {
  keypair = bitcoin.ECPair.fromWIF(privateKey, network);
} else {
  privateKey = keypair.toWIF();
  localStorage.setItem('privateKey', privateKey);
}

let address: string | null = localStorage.getItem('address');
if (!address) {
  const p2pkh = bitcoin.payments.p2pkh({ pubkey: keypair.publicKey, network });
  if (p2pkh.address) {
    address = p2pkh.address;
    localStorage.setItem('address', address);
  }
}

function chooseInputUTXOs(utxoArray: TXRef[], amount: number) {
  const bigEnoughtUTXOs = utxoArray.filter((utxo: TXRef) => utxo.value >= amount);

  if (bigEnoughtUTXOs.length) {
    const utxo = bigEnoughtUTXOs.reduce(
      (result, utxo) => utxo.value - amount < result.value - amount ? utxo : result,
      bigEnoughtUTXOs[0]
    );

    return [utxo];
  } else {
    const utxos: TXRef[] = [];
    let sendingAmount = 0
    for (let index = 0; index < utxoArray.length; index++) {
      utxos.push(utxoArray[index]);
      sendingAmount += utxoArray[index].value;
      if (sendingAmount >= amount) break;
    }

    return utxos;
  }
}

function App() {
  const [balance, setBalance] = useState(0);
  const [utxo, setUtxo] = useState<TXRef[]>([]);
  const [sendTo, setSendTo] = useState('');
  const [amount, setAmount] = useState(0);

  const getUTXOs = () => {
    fetch(`${API}/addrs/${address}?unspentOnly=true`)
      .then(res => res.json())
      .then((res: WalletInfoResponse) => {
        setBalance(res.final_balance);
        let freshUTXOs: TXRef[] = [];
        if (res.txrefs) freshUTXOs = freshUTXOs.concat(res.txrefs);
        if (res.unconfirmed_txrefs) freshUTXOs = freshUTXOs.concat(res.unconfirmed_txrefs);

        setUtxo(freshUTXOs);
        console.log(freshUTXOs)
      })
      .catch(error => {
        console.error(error);
        return {};
      });
  };

  const postTX = (txHex: string): void => {
    fetch(`${API}/txs/push`, {
      method: 'POST',
      body: JSON.stringify({ tx: txHex })
    })
      .then(res => res.json())
      .then(res => {
        console.log(res);
        getUTXOs();
        // TODO: сделать красивую модалку
        alert(`${amount} satoshi sent to ${sendTo}`);
        setSendTo('');
        setAmount(0);
      })
      .catch(error => {
        console.error(error);
      });
  };

  useEffect(() => {
    getUTXOs();
  }, []);

  const submitHandler = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const tx = new bitcoin.TransactionBuilder(network);
    const inputs = chooseInputUTXOs(utxo, amount);
    inputs.forEach(utxo => {
      tx.addInput(utxo.tx_hash, utxo.tx_output_n);
    });
    // TODO: остаток средств переводить на другой адресс пользователя
    tx.addOutput(sendTo, amount);
    for (let index = 0; index < inputs.length; index++) {
      tx.sign(index, keypair);
    }

    const txHex = tx.build().toHex();
    console.log(txHex);
    postTX(txHex);
  };

  return (
    <div className="App">
      <p>Your Address: {address}</p>
      {/* TODO: отображать спинер, когда запрос баланса в обработке */}
      <p>Balance: {balance} satoshi</p>
      <button onClick={getUTXOs}>Refresh Balance</button>

      <form onSubmit={submitHandler} className="form">
        <h2>Create Transaction</h2>

        <label className="form-label" htmlFor="sendTo">Address:</label>
        <div className="form-field">
          <input required
            id="sendTo"
            value={sendTo}
            onChange={e => setSendTo(e.target.value)}
          />
        </div>

        <label className="form-label" htmlFor="amount">Amount:</label>
        <div className="form-field">
          <input required
            className="number-input"
            id="amount"
            value={amount}
            type="number"
            min={1}
            max={balance}
            onChange={e => setAmount(+e.target.value)}
          />
          <span>satoshi</span>
        </div>
        {/* TODO: отображать спинер, когда пока не прийдёт ответ с API*/}
        <button>SEND</button>
      </form>
    </div>
  );
}

export default App;
