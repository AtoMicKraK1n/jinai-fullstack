import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import bs58 from "bs58";
import idl from "@/app/lib/IDL.json"; // make sure this path is correct

const PROGRAM_ID = new PublicKey(
  "Hqs1UsDrx9s79o2Jm1z9MZxoVsAb9uAU7YMDgWKAwX7G"
);
const TREASURY_PUBKEY = new PublicKey(
  "GkiKqSVfnU2y4TeUW7up2JS9Z8g1yjGYJ8x2QNf4K6Y"
);
const GLOBAL_STATE_SEED = Buffer.from("global-state");
const POOL_SEED = Buffer.from("pool");

export async function POST(req: NextRequest) {
  try {
    const { entryFeeBps, minDeposit, endTime, prizeDistribution } =
      await req.json();

    const connection = new Connection(process.env.RPC_URL!, "confirmed");

    // Load in-game wallet from ENV or DB
    const secretKey = bs58.decode(process.env.IN_GAME_WALLET_SECRET!);
    const inGameKeypair = Keypair.fromSecretKey(secretKey);

    const wallet = new anchor.Wallet(inGameKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program(
      idl as unknown as anchor.Idl,
      PROGRAM_ID,
      provider
    );

    // Derive global_state PDA
    const [globalStatePda] = await PublicKey.findProgramAddressSync(
      [GLOBAL_STATE_SEED],
      PROGRAM_ID
    );

    // 1️⃣ Call `appoint_pool` — can skip this if already initialized
    try {
      await program.methods
        .appointPool(entryFeeBps)
        .accounts({
          globalState: globalStatePda,
          authority: inGameKeypair.publicKey,
          treasury: TREASURY_PUBKEY,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (err: any) {
      if (
        err.message.includes("already in use") ||
        err.message.includes("custom program error")
      ) {
        console.log(
          "✅ Global state already initialized, skipping appointPool"
        );
      } else {
        throw err;
      }
    }

    // Fetch pool_count from global_state
    const globalStateAccount = await program.account.globalState.fetch(
      globalStatePda
    );
    const poolCount = globalStateAccount.poolCount.toNumber();

    // Derive pool PDA using seed: ["pool", globalState.pool_count]
    const poolCountBuffer = Buffer.alloc(8);
    poolCountBuffer.writeBigInt64LE(BigInt(poolCount));

    const [poolPda] = await PublicKey.findProgramAddressSync(
      [POOL_SEED, poolCountBuffer],
      PROGRAM_ID
    );

    // Convert endTime to Unix timestamp
    const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

    // 2️⃣ Call `create_pool`
    await program.methods
      .createPool(
        new anchor.BN(minDeposit),
        new anchor.BN(endTimestamp),
        prizeDistribution
      )
      .accounts({
        globalState: globalStatePda,
        pool: poolPda,
        creator: inGameKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return NextResponse.json({
      success: true,
      message: "Pool created successfully",
      poolAddress: poolPda.toBase58(),
      poolCount,
    });
  } catch (err: any) {
    console.error("❌ Error in creating pool:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
