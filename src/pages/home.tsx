import { useState, useEffect, useMemo } from 'react';
import { useWallet } from "@solana/wallet-adapter-react";
import {Connection,Keypair,PublicKey,Transaction,ConfirmOptions,SystemProgram,clusterApiUrl,SYSVAR_CLOCK_PUBKEY} from '@solana/web3.js'
import {TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import { programs } from '@metaplex/js'
import useNotify from './notify'
import axios from "axios"
import Vector from '../assets/images/Vector.png'
import HomeIcon from '../assets/images/home-icon.png'
import StakingIcon from '../assets/images/staking-icon.png'
import ShopIcon from '../assets/images/shop-icon.png'
import AuctionsIcon from '../assets/images/auctions-icon.png'
import LabIcon from '../assets/images/lab-icon.png'
import SniperIcon from '../assets/images/sniper-icon.png'
import WalletIcon from '../assets/images/wallet-icon.png'

// import NFT from '../assets/images/nft.png'
import {WalletConnect} from '../wallet';
// const nfts = Array(30).fill(0)

let wallet : any
let conn = new Connection(clusterApiUrl('devnet'))
let notify: any

const { metadata: { Metadata } } = programs
const programId = new PublicKey('32gd7qY8FjvvAC2cHP4spLCHgYGXT9b8TiBW8aSCVEW7')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
const idl = require('./staking.json')
const confirmOption : ConfirmOptions = {commitment : 'finalized',preflightCommitment : 'finalized',skipPreflight : false}
const STAKING_DATA_SIZE = 8+ 32+32+1+32+8+8+1;

const POOL_DATA = {
	token : new PublicKey("5Pdw82Xqs6kzSZf2p472LbKb4FqegtQkgoaXCnE4URfa"),
	period : 60,
	pools : [
		{
			address : new PublicKey("7j5ZMRbeVXum1weH1UYK1heq5dEm6uEtpXa6H3CykEHi"),
			tokenAccount : new PublicKey('DHXCj6zjynADTzTcgrTxHq76pWRWTfLs81yFFvtHRqKP'),
			collectionName : "Gorilla",
			rewardAmount : 0.01
		},
		{
			address : new PublicKey("97YVtKrqJGPMMrqBcKhmY44ZuecLA89mYj4cJ6pchoZt"),
			tokenAccount : new PublicKey('HPcumqhpTfHYPc62u4S83vABbLuKg9Nx4o1DkU9kkWpa'),
			collectionName : "Solbot",
			rewardAmount : 3
		},
	],
}

export default function Home(){
	wallet = useWallet()
	notify = useNotify()

	const [page, setPage] = useState(0)

	const [isOpenMenu, setIsOpenMenu] = useState(false)

	const [ownedNfts, setOwnedNfts] = useState<any[]>([])
	const [ownedStakeNfts, setOwnedStakeNfts] = useState<any[]>([])
	const [ownedTokenAmount, setOwnedTokenAmount] = useState(0)

	useEffect(()=>{
		if(wallet.publicKey!=null){
			getTokenAmount()
			getOwnedNfts()
		}else{
			setOwnedTokenAmount(0)
			setOwnedNfts([])
			setOwnedStakeNfts([])
		}
	},[wallet, wallet.publicKey])
	const [program] = useMemo(()=>{
		const provider = new anchor.AnchorProvider(conn, wallet as any, confirmOption)
		const program = new anchor.Program(idl, programId, provider)
		return [program]
	}, [])
	const createAssociatedTokenAccountInstruction = (
		associatedTokenAddress: anchor.web3.PublicKey,
		payer: anchor.web3.PublicKey,
		walletAddress: anchor.web3.PublicKey,
		splTokenMintAddress: anchor.web3.PublicKey
		) => {
		const keys = [
		  { pubkey: payer, isSigner: true, isWritable: true },
		  { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
		  { pubkey: walletAddress, isSigner: false, isWritable: false },
		  { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
		  {
			pubkey: anchor.web3.SystemProgram.programId,
			isSigner: false,
			isWritable: false,
		  },
		  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
		  {
			pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
			isSigner: false,
			isWritable: false,
		  },
		];
		return new anchor.web3.TransactionInstruction({
		  keys,
		  programId: ASSOCIATED_TOKEN_PROGRAM_ID,
		  data: Buffer.from([]),
		});
	}
	const getTokenWallet = async (owner: PublicKey,mint: PublicKey) => {
		return (
		  await PublicKey.findProgramAddress(
			[owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
			ASSOCIATED_TOKEN_PROGRAM_ID
		  )
		)[0];
	}
	const getMetadata = async (
		mint: PublicKey
		  ): Promise<PublicKey> => {
		return (
		  await PublicKey.findProgramAddress(
			[
			  Buffer.from("metadata"),
			  TOKEN_METADATA_PROGRAM_ID.toBuffer(),
			  mint.toBuffer(),
			],
			TOKEN_METADATA_PROGRAM_ID
		  )
		)[0];
	};
	const getTokenAmount = async() => {
		try{
			if(wallet!=null && wallet.publicKey!=null){
				const tokenAccount = await getTokenWallet(wallet.publicKey, POOL_DATA.token)
				let amount = 0
				if(await conn.getAccountInfo(tokenAccount)){
					let resp : any = (await conn.getTokenAccountBalance(tokenAccount)).value
					amount = Number(resp.uiAmount)
				}
				setOwnedTokenAmount(amount)
			}else{
				setOwnedTokenAmount(0)
			}
		}catch(err){
			setOwnedTokenAmount(0)
		}
	}
	async function getNftsForOwner(
		owner : PublicKey
		){
		const allTokens: any[] = []
		const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {
		  programId: TOKEN_PROGRAM_ID
		});
		for (let index = 0; index < tokenAccounts.value.length; index++) {
		  try{
			const tokenAccount = tokenAccounts.value[index];
			const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
  
			if (tokenAmount.amount === "1" && tokenAmount.decimals == "0") {
			  let nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
			  let pda = await getMetadata(nftMint)
			  const accountInfo: any = await conn.getParsedAccountInfo(pda);
			  let metadata : any = new Metadata(owner.toString(), accountInfo.value);
			  const { data }: any = await axios.get(metadata.data.data.uri)
			  POOL_DATA.pools.map((item, idx)=>{
			  	if(metadata.data.data.symbol === item.collectionName){
					const entireData = { ...data, id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0]) }
					allTokens.push({address : nftMint, metadata : metadata.data.data, offChainData : entireData, selected : false, family : idx })
			  	}
			  })
			}
			allTokens.sort(function (a: any, b: any) {
			  if (a.name < b.name) { return -1; }
			  if (a.name > b.name) { return 1; }
			  return 0;
			})
		  } catch(err) {
			continue;
		  }
		}
		console.log(allTokens)
		return allTokens
	}
	async function getStakedNftsForOwner(
		owner : PublicKey,
		){
		try{
			const allTokens : any[] = []
			const walletAddress = wallet.publicKey.toBase58()
			for(let idx in POOL_DATA.pools){
				let item = POOL_DATA.pools[idx]
				let resp = await conn.getProgramAccounts(programId,{
					dataSlice : {length : 0, offset : 0},
					filters:[
						{dataSize : STAKING_DATA_SIZE},
						{memcmp:{offset:8,bytes:item.address.toBase58()}},
						{memcmp:{offset:73,bytes:walletAddress}}
					]
				})
				for(let nftAccount of resp){
					let stakedNft = (await program.account.stakingData.fetch(nftAccount.pubkey)) as any
					if(stakedNft.isStaked === false) continue;
					try{
						let pda = await getMetadata(stakedNft.nftMint)
						const accountInfo: any = await conn.getParsedAccountInfo(pda);
						let metadata : any = new Metadata(owner.toString(), accountInfo.value);
						const { data }: any = await axios.get(metadata.data.data.uri)
						const entireData = { ...data, id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0]) }
						allTokens.push({address : stakedNft.nftMint, stakingDataAccount : nftAccount.pubkey, metadata : metadata.data.data, offChainData : entireData, stakeTime : stakedNft.stakeTime.toNumber(), claimNumber : stakedNft.claimNumber.toNumber(), selected : false, family : idx})
					}catch(err){
						console.log(err)
						continue;
					}
				}	
			} 
			return allTokens
		}catch(err){
			return []
		}
	}
	async function getOwnedNfts(){
		if(wallet.publicKey != null){
			setOwnedNfts(await getNftsForOwner(wallet.publicKey))
			setOwnedStakeNfts(await getStakedNftsForOwner(wallet.publicKey))
		}
	}
	const handleSelectNft = (index : number) => {
		setOwnedNfts(ownedNfts.map((item, idx)=>{
			if(index === idx){
				return {...item, selected : !item.selected}
			}
			return item
		}))
	}
	const handleSelectStakeNft = (index : number) => {
		setOwnedStakeNfts(ownedStakeNfts.map((item, idx)=>{
			if(index === idx){
				return {...item, selected : !item.selected}
			}
			return item
		}))
	}

	const stake = async(isAll : boolean) => {
		try{
			let transactions : Transaction[] = [];
			// let pool = POOL_DATA.address
			for(let item of ownedNfts){
				let pool = POOL_DATA.pools[item.family].address
				if(isAll===false && item.selected===false) continue;
				let transaction = new Transaction()
				let nftMint = item.address
				const [stakingData, bump] = await PublicKey.findProgramAddress([nftMint.toBuffer(), pool.toBuffer()],programId)
				if((await conn.getAccountInfo(stakingData)) == null){
					const metadata = await getMetadata(nftMint)
					transaction.add(program.instruction.initStakingData(
						new anchor.BN(bump),
						{
							accounts:{
								owner : wallet.publicKey,
								pool : pool,
								nftMint : nftMint,
								metadata : metadata,
								stakingData : stakingData,
								systemProgram : SystemProgram.programId,
							}
						}
					))
				}
				let nftTo = await getTokenWallet(pool, nftMint)
				if((await conn.getAccountInfo(nftTo)) == null)
					transaction.add(createAssociatedTokenAccountInstruction(nftTo,wallet.publicKey, pool, nftMint))
				transaction.add(program.instruction.stake({
					accounts:{
						owner : wallet.publicKey,
						stakingData : stakingData,
						nftFrom : await getTokenWallet(wallet.publicKey, nftMint),
						nftTo : nftTo,
						tokenProgram : TOKEN_PROGRAM_ID,
						clock : SYSVAR_CLOCK_PUBKEY,
					}
				}))
				transactions.push(transaction)
			}
			await sendAllTransaction(transactions)
			notify('success', 'Success!')
		}catch(err){
			console.log(err)
			notify('error', 'Failed Instruction!')
		}
	}
	const unstake = async(isAll : boolean) => {
		try{
			let transactions : Transaction[] = []
			// let pool = POOL_DATA.address
			for(let item of ownedStakeNfts){
				let pool = POOL_DATA.pools[item.family].address
				if(isAll==false && item.selected===false) continue;
				let transaction = new Transaction()
				let nftMint = item.address
				const [stakingData, ] = await PublicKey.findProgramAddress([nftMint.toBuffer(), pool.toBuffer()],programId)
				transaction.add(program.instruction.unstake({
					accounts:{
						owner : wallet.publicKey,
						pool : pool,
						stakingData: stakingData,
						nftFrom : await getTokenWallet(pool, nftMint),
						nftTo : await getTokenWallet(wallet.publicKey, nftMint),
						tokenProgram : TOKEN_PROGRAM_ID,
						clock : SYSVAR_CLOCK_PUBKEY
					}
				}))
				transactions.push(transaction)
			}
			await sendAllTransaction(transactions)
			notify('success', 'Success!')
		}catch(err){
			console.log(err)
			notify('error', 'Failed Instruction!')
		}
	}
	const claim = async() => {
		try{
			let transactions : Transaction[] = []
			// let pool = POOL_DATA.address
			let tokenTo = await getTokenWallet(wallet.publicKey, POOL_DATA.token)
			if((await conn.getAccountInfo(tokenTo))==null){
				let tx = new Transaction()
				tx.add(createAssociatedTokenAccountInstruction(tokenTo, wallet.publicKey, wallet.publicKey, POOL_DATA.token))
				transactions.push(tx)
			}
			for(let item of ownedStakeNfts){
				let pool = POOL_DATA.pools[item.family].address
				let tokenFrom = await getTokenWallet(pool, POOL_DATA.token)
				let transaction = new Transaction()
				transaction.add(program.instruction.claim({
					accounts:{
						owner : wallet.publicKey,
						pool : pool,
						stakingData : item.stakingDataAccount,
						tokenFrom : tokenFrom,
						tokenTo : tokenTo,
						tokenProgram : TOKEN_PROGRAM_ID,
						clock : SYSVAR_CLOCK_PUBKEY
					}
				}))
				transactions.push(transaction)
			}
			console.log(transactions)
			await sendAllTransaction(transactions)
		  notify('success', 'Success!')
		} catch(err){
			console.log(err)
			notify('error', 'Failed Instruction!')
		}		
	}
	async function sendTransaction(transaction : Transaction, signers : Keypair[]) {
		transaction.feePayer = wallet.publicKey
		transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;
		await transaction.setSigners(wallet.publicKey,...signers.map(s => s.publicKey));
		if(signers.length != 0) await transaction.partialSign(...signers)
		const signedTransaction = await wallet.signTransaction(transaction);
		let hash = await conn.sendRawTransaction(await signedTransaction.serialize());
		await conn.confirmTransaction(hash);
		return hash
	}
	async function sendAllTransaction(transactions : Transaction[]){
		let unsignedTxns : Transaction[] = []
		let block = await conn.getRecentBlockhash('max');
		for(let i =0; i<transactions.length;i++){
			let transaction = transactions[i]
			transaction.recentBlockhash = block.blockhash;
			transaction.setSigners(wallet.publicKey)
			unsignedTxns.push(transaction)
		}
		const signedTxns = await wallet.signAllTransactions(unsignedTxns)
		for(let i=0;i<signedTxns.length;i++){
			let hash = await conn.sendRawTransaction(await signedTxns[i].serialize())
			await conn.confirmTransaction(hash)
		}
	}

	return <div className="back-group">
	{
		page===0 ?
			<div className={isOpenMenu ? "card back-panel home-page dark-panel" : "card back-panel home-page"}>
				<div className='bottom-title-1'>
					&gt; solbots v1.0
				</div>
				<div className='bottom-title-2'
					onClick={()=>{
					setIsOpenMenu(true)
				}}>
					&gt; enter
				</div>
				{
					isOpenMenu &&
					<div className='menu-bar'>
						<div className='menu-item' onClick={()=>{
							setPage(0)
							setIsOpenMenu(false)
						}}>
							<button><img src={HomeIcon} alt="home"></img></button>
							<p>&gt; home</p>
						</div>
						<div className='menu-item' onClick={()=>{
							setPage(1)
							setIsOpenMenu(false)
						}}>
							<button><img src={StakingIcon} alt="staking"></img></button>
							<p>&gt; staking</p>
						</div>	
						<div className='menu-item'>
							<button><img src={ShopIcon} alt="shop"></img></button>
							<p>&gt; shop</p>
						</div>	
						<div className='menu-item'>
							<button><img src={AuctionsIcon} alt="auctions"></img></button>
							<p>&gt; auctions</p>
						</div>
						<div className='menu-item'>
							<button><img src={LabIcon} alt="lab"></img></button>
							<p>&gt; lab</p>
						</div>
						<div className='menu-item'>
							<button><img src={SniperIcon} alt="sniper"></img></button>
							<p>&gt; sniper</p>
						</div>
						<div className='menu-item'>
							{/* <button><img src={WalletIcon} alt="wallet"></img></button> */}
							<WalletConnect></WalletConnect>
							{/* <p>&gt; wallet</p> */}
						</div>			
					</div>
				}
			</div>
		:
			<div className="card back-panel staking-page">
				<div className='card-mark'>
					<img style={{width : "40px"}} src={Vector} alt="vector"></img>
					<p style={{marginBottom : "0px"}}>oil collected</p>
					<p style={{marginBottom : "0px", fontSize : "16px", fontWeight:"500"}}>{ownedTokenAmount} $OIL</p>
				</div>
				<div className="card-content row">
					<div className="col-lg-6 card-group solbots-panel">
						<h3>solbots</h3>
						<div className="image-panel">
							<div className='row pt-2'>
								<div className='col-sm-7'>
									<button className='btn' onClick={async ()=>{
										await stake(false)
										await getOwnedNfts()
									}}>&gt; Stake Selected</button>
								</div>
								<div className='col-sm-5'>
									<button className='btn' onClick={async ()=>{
										await stake(true)
										await getOwnedNfts()
									}}>&gt; Stake All</button>
								</div>
							</div>
							<div className='nft-panel pt-3 m-2'>
								<div className="nft-panel-content">
								{
									ownedNfts.map((item, idx)=>{
										return <div className='nft' key={idx}>
											<img className={item.selected ? "red-border" : "normal-border"} src={item.offChainData.image} alt="nft" onClick={()=>{
												handleSelectNft(idx)
											}}/>
											<p style={{color : item.selected ? "red" : "#e9ffc5"}}>{item.metadata.name}</p>
										</div>
									})
								}
								</div>
							</div>
						</div>
					</div>
					<div className="col-lg-6 card-group staked-panel">
						<h3>staked</h3>
						<div className="image-panel">
							<div className='row pt-2'>
								<div className='col-sm-7'>
									<button className='btn' onClick={async()=>{
										await unstake(false)
										await getOwnedNfts()
									}}>&gt; Unstake Selected</button>
								</div>
								<div className='col-sm-5'>
									<button className='btn' onClick={async()=>{
										await unstake(true)
										await getOwnedNfts()
									}}>&gt; Unstake All</button>
								</div>
							</div>
							<div className='nft-panel pt-3 m-2'>
								<div className="nft-panel-content">
								{
									ownedStakeNfts.map((item, idx)=>{
										let time = (new Date()).getTime() / 1000
										return <div className='nft' key={idx}>
											<img className={item.selected ? "red-border" : "normal-border"} src={item.offChainData.image} alt="nft" onClick={()=>{
												handleSelectStakeNft(idx)
											}}/>
											<p style={{color : item.selected ? "red" : "#e9ffc5", marginBottom : 0}}>{item.metadata.name}</p>
											<p style={{color : item.selected ? "red" : "#e9ffc5"}}>$OIL | {POOL_DATA.pools[item.family].rewardAmount * Math.floor((time-item.stakeTime+30)/POOL_DATA.period - item.claimNumber)}</p>
										</div>
									})
								}
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="claim-part">
					<button className='btn' onClick={async()=>{
						await claim()
						await getOwnedNfts()
						await getTokenAmount()
					}}>CLAIM REWARDS</button>
				</div>
				<div className='bottom-title'>&gt; created in the underworld by OMENS</div>
				<div className='menu-bar'>
					<div onClick={()=>{
						setPage(0)
						setIsOpenMenu(false)
					}}>
						<button><img src={HomeIcon} alt="home"></img></button>
						<p>&gt; home</p>
					</div>
					<div onClick={()=>{
						setPage(1)
						setIsOpenMenu(false)
					}}>
						<button><img src={StakingIcon} alt="staking"></img></button>
						<p>&gt; staking</p>
					</div>	
					<div>
						<button><img src={ShopIcon} alt="shop"></img></button>
						<p>&gt; shop</p>
					</div>	
					<div>
						<button><img src={AuctionsIcon} alt="auctions"></img></button>
						<p>&gt; auctions</p>
					</div>
					<div>
						<button><img src={LabIcon} alt="lab"></img></button>
						<p>&gt; lab</p>
					</div>
					<div>
						<button><img src={SniperIcon} alt="sniper"></img></button>
						<p>&gt; sniper</p>
					</div>			
				</div>
			</div>
	}
	</div>
}