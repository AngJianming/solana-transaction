import { Program, AnchorProvider, setProvider, web3, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MockPresale } from "../target/types/mock_presale";
import IDL from "../target/idl/mock_presale.json";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Configure the client
  const provider = AnchorProvider.env();
  setProvider(provider);
  
  // Load the program
  const program = new Program<MockPresale>(
    IDL,
    provider
  );

  const authority = provider.wallet.publicKey;
  
  const tokenMint = new web3.PublicKey("2kWHF9xq2ScP2aUcDLnVMQdoqCWdroBx6oGtjYrgrLwz");

  // Derive the token vault PDA using seed "token-vault" and token mint
  const [tokenVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("token-vault"), tokenMint.toBuffer()],
    program.programId
  );
  console.log("Token Vault PDA:", tokenVaultPDA.toString());
  
  // Derive the program state PDA using seed "state"
  const [programStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("state")],
    program.programId
  );
  console.log("Program State PDA:", programStatePDA.toString());
  
  // Set tokens to SOL rate (10,000)
  const tokensToSolRate = new BN(10000);
  
  try {
    console.log("Initializing vault...");
    const tx = await program.methods
      .initialize(tokensToSolRate)
      .accounts({
        programState: programStatePDA,
        tokenMint: tokenMint,
        tokenVault: tokenVaultPDA,
        authority: authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log("Transaction signature:", tx);
    console.log("Vault initialized with tokens to SOL rate:", tokensToSolRate.toString());
    
    // Fetch the program state account to verify it was initialized correctly
    const stateAccount = await program.account.programState.fetch(programStatePDA);
    console.log("Program state account:", {
      authority: stateAccount.authority.toString(),
      tokenMint: stateAccount.tokenMint.toString(),
      tokenVault: stateAccount.tokenVault.toString(),
      tokensToSolRate: stateAccount.tokensToSolRate.toString()
    });
    
  } catch (error) {
    console.error("Error initializing vault:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });