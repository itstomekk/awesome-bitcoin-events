<div class="wp-paper" lang="en">
<h1>Bitcoin: A Peer-to-Peer Electronic Cash System</h1>
<p class="wp-author">Satoshi Nakamoto<br><a href="mailto:satoshin@gmx.com">satoshin@gmx.com</a><br><a href="http://www.bitcoin.org">www.bitcoin.org</a></p>
<section class="wp-abstract"><p><strong>Abstract.</strong> A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution. Digital signatures provide part of the solution, but the main benefits are lost if a trusted third party is still required to prevent double-spending. We propose a solution to the double-spending problem using a peer-to-peer network. The network timestamps transactions by hashing them into an ongoing chain of hash-based proof-of-work, forming a record that cannot be changed without redoing the proof-of-work. The longest chain not only serves as proof of the sequence of events witnessed, but proof that it came from the largest pool of CPU power. As long as a majority of CPU power is controlled by nodes that are not cooperating to attack the network, they&#x27;ll generate the longest chain and outpace attackers. The network itself requires minimal structure. Messages are broadcast on a best effort basis, and nodes can leave and rejoin the network at will, accepting the longest proof-of-work chain as proof of what happened while they were gone.</p></section>
<h2 id="en-s1-introduction">1. Introduction</h2>
<p>Commerce on the Internet has come to rely almost exclusively on financial institutions serving as trusted third parties to process electronic payments. While the system works well enough for most transactions, it still suffers from the inherent weaknesses of the trust based model. Completely non-reversible transactions are not really possible, since financial institutions cannot avoid mediating disputes. The cost of mediation increases transaction costs, limiting the minimum practical transaction size and cutting off the possibility for small casual transactions, and there is a broader cost in the loss of ability to make non-reversible payments for non-reversible services. With the possibility of reversal, the need for trust spreads. Merchants must be wary of their customers, hassling them for more information than they would otherwise need. A certain percentage of fraud is accepted as unavoidable. These costs and payment uncertainties can be avoided in person by using physical currency, but no mechanism exists to make payments over a communications channel without a trusted party.</p>
<p>What is needed is an electronic payment system based on cryptographic proof instead of trust, allowing any two willing parties to transact directly with each other without the need for a trusted third party. Transactions that are computationally impractical to reverse would protect sellers from fraud, and routine escrow mechanisms could easily be implemented to protect buyers. In this paper, we propose a solution to the double-spending problem using a peer-to-peer distributed timestamp server to generate computational proof of the chronological order of transactions. The system is secure as long as honest nodes collectively control more CPU power than any cooperating group of attacker nodes.</p>
<h2 id="en-s2-transactions">2. Transactions</h2>
<p>We define an electronic coin as a chain of digital signatures. Each owner transfers the coin to the next by digitally signing a hash of the previous transaction and the public key of the next owner and adding these to the end of the coin. A payee can verify the signatures to verify the chain of ownership.</p>
<figure class="wp-fig"><img src="figures/fig-1.png" alt="Diagram: a chain of transactions. Each owner signs a hash of the previous transaction and the next owner&#x27;s public key." loading="lazy"></figure>
<p>The problem of course is the payee can&#x27;t verify that one of the owners did not double-spend the coin. A common solution is to introduce a trusted central authority, or mint, that checks every transaction for double spending. After each transaction, the coin must be returned to the mint to issue a new coin, and only coins issued directly from the mint are trusted not to be double-spent. The problem with this solution is that the fate of the entire money system depends on the company running the mint, with every transaction having to go through them, just like a bank.</p>
<p>We need a way for the payee to know that the previous owners did not sign any earlier transactions. For our purposes, the earliest transaction is the one that counts, so we don&#x27;t care about later attempts to double-spend. The only way to confirm the absence of a transaction is to be aware of all transactions. In the mint based model, the mint was aware of all transactions and decided which arrived first. To accomplish this without a trusted party, transactions must be publicly announced [1], and we need a system for participants to agree on a single history of the order in which they were received. The payee needs proof that at the time of each transaction, the majority of nodes agreed it was the first received.</p>
<h2 id="en-s3-timestamp-server">3. Timestamp Server</h2>
<p>The solution we propose begins with a timestamp server. A timestamp server works by taking a hash of a block of items to be timestamped and widely publishing the hash, such as in a newspaper or Usenet post [2-5]. The timestamp proves that the data must have existed at the time, obviously, in order to get into the hash. Each timestamp includes the previous timestamp in its hash, forming a chain, with each additional timestamp reinforcing the ones before it.</p>
<figure class="wp-fig"><img src="figures/fig-2.png" alt="Diagram: a timestamp server. Each block of items is hashed together with the previous hash." loading="lazy"></figure>
<h2 id="en-s4-proof-of-work">4. Proof-of-Work</h2>
<p>To implement a distributed timestamp server on a peer-to-peer basis, we will need to use a proof-of-work system similar to Adam Back&#x27;s Hashcash [6], rather than newspaper or Usenet posts. The proof-of-work involves scanning for a value that when hashed, such as with SHA-256, the hash begins with a number of zero bits. The average work required is exponential in the number of zero bits required and can be verified by executing a single hash.</p>
<p>For our timestamp network, we implement the proof-of-work by incrementing a nonce in the block until a value is found that gives the block&#x27;s hash the required zero bits. Once the CPU effort has been expended to make it satisfy the proof-of-work, the block cannot be changed without redoing the work. As later blocks are chained after it, the work to change the block would include redoing all the blocks after it.</p>
<figure class="wp-fig"><img src="figures/fig-3.png" alt="Diagram: proof-of-work blocks, each holding the previous hash, a nonce and transactions." loading="lazy"></figure>
<p>The proof-of-work also solves the problem of determining representation in majority decision making. If the majority were based on one-IP-address-one-vote, it could be subverted by anyone able to allocate many IPs. Proof-of-work is essentially one-CPU-one-vote. The majority decision is represented by the longest chain, which has the greatest proof-of-work effort invested in it. If a majority of CPU power is controlled by honest nodes, the honest chain will grow the fastest and outpace any competing chains. To modify a past block, an attacker would have to redo the proof-of-work of the block and all blocks after it and then catch up with and surpass the work of the honest nodes. We will show later that the probability of a slower attacker catching up diminishes exponentially as subsequent blocks are added.</p>
<p>To compensate for increasing hardware speed and varying interest in running nodes over time, the proof-of-work difficulty is determined by a moving average targeting an average number of blocks per hour. If they&#x27;re generated too fast, the difficulty increases.</p>
<h2 id="en-s5-network">5. Network</h2>
<p>The steps to run the network are as follows:</p>
<p>1)</p>
<p>New transactions are broadcast to all nodes. 2)</p>
<p>Each node collects new transactions into a block. 3)</p>
<p>Each node works on finding a difficult proof-of-work for its block. 4)</p>
<p>When a node finds a proof-of-work, it broadcasts the block to all nodes. 5)</p>
<p>Nodes accept the block only if all transactions in it are valid and not already spent. 6)</p>
<p>Nodes express their acceptance of the block by working on creating the next block in the chain, using the hash of the accepted block as the previous hash.</p>
<p>Nodes always consider the longest chain to be the correct one and will keep working on extending it. If two nodes broadcast different versions of the next block simultaneously, some nodes may receive one or the other first. In that case, they work on the first one they received, but save the other branch in case it becomes longer. The tie will be broken when the next proof-of-work is found and one branch becomes longer; the nodes that were working on the other branch will then switch to the longer one.</p>
<p>New transaction broadcasts do not necessarily need to reach all nodes. As long as they reach many nodes, they will get into a block before long. Block broadcasts are also tolerant of dropped messages. If a node does not receive a block, it will request it when it receives the next block and realizes it missed one.</p>
<h2 id="en-s6-incentive">6. Incentive</h2>
<p>By convention, the first transaction in a block is a special transaction that starts a new coin owned by the creator of the block. This adds an incentive for nodes to support the network, and provides a way to initially distribute coins into circulation, since there is no central authority to issue them. The steady addition of a constant of amount of new coins is analogous to gold miners expending resources to add gold to circulation. In our case, it is CPU time and electricity that is expended.</p>
<p>The incentive can also be funded with transaction fees. If the output value of a transaction is less than its input value, the difference is a transaction fee that is added to the incentive value of the block containing the transaction. Once a predetermined number of coins have entered circulation, the incentive can transition entirely to transaction fees and be completely inflation free.</p>
<p>The incentive may help encourage nodes to stay honest. If a greedy attacker is able to assemble more CPU power than all the honest nodes, he would have to choose between using it to defraud people by stealing back his payments, or using it to generate new coins. He ought to find it more profitable to play by the rules, such rules that favour him with more new coins than everyone else combined, than to undermine the system and the validity of his own wealth.</p>
<h2 id="en-s7-reclaiming-disk-space">7. Reclaiming Disk Space</h2>
<p>Once the latest transaction in a coin is buried under enough blocks, the spent transactions before it can be discarded to save disk space. To facilitate this without breaking the block&#x27;s hash, transactions are hashed in a Merkle Tree [7][2][5], with only the root included in the block&#x27;s hash. Old blocks can then be compacted by stubbing off branches of the tree. The interior hashes do not need to be stored.</p>
<figure class="wp-fig"><img src="figures/fig-4.png" alt="Diagram: transactions hashed in a Merkle tree; after pruning, only the root hash stays in the block header." loading="lazy"></figure>
<p>A block header with no transactions would be about 80 bytes. If we suppose blocks are generated every 10 minutes, 80 bytes * 6 * 24 * 365 = 4.2MB per year. With computer systems typically selling with 2GB of RAM as of 2008, and Moore&#x27;s Law predicting current growth of 1.2GB per year, storage should not be a problem even if the block headers must be kept in memory.</p>
<h2 id="en-s8-simplified-payment-verification">8. Simplified Payment Verification</h2>
<p>It is possible to verify payments without running a full network node. A user only needs to keep a copy of the block headers of the longest proof-of-work chain, which he can get by querying network nodes until he&#x27;s convinced he has the longest chain, and obtain the Merkle branch linking the transaction to the block it&#x27;s timestamped in. He can&#x27;t check the transaction for himself, but by linking it to a place in the chain, he can see that a network node has accepted it, and blocks added after it further confirm the network has accepted it.</p>
<figure class="wp-fig"><img src="figures/fig-5.png" alt="Diagram: the longest proof-of-work chain of block headers, with the Merkle branch for one transaction." loading="lazy"></figure>
<p>As such, the verification is reliable as long as honest nodes control the network, but is more vulnerable if the network is overpowered by an attacker. While network nodes can verify transactions for themselves, the simplified method can be fooled by an attacker&#x27;s fabricated transactions for as long as the attacker can continue to overpower the network. One strategy to protect against this would be to accept alerts from network nodes when they detect an invalid block, prompting the user&#x27;s software to download the full block and alerted transactions to confirm the inconsistency. Businesses that receive frequent payments will probably still want to run their own nodes for more independent security and quicker verification.</p>
<h2 id="en-s9-combining-and-splitting-value">9. Combining and Splitting Value</h2>
<p>Although it would be possible to handle coins individually, it would be unwieldy to make a separate transaction for every cent in a transfer. To allow value to be split and combined, transactions contain multiple inputs and outputs. Normally there will be either a single input from a larger previous transaction or multiple inputs combining smaller amounts, and at most two outputs: one for the payment, and one returning the change, if any, back to the sender.</p>
<figure class="wp-fig"><img src="figures/fig-6.png" alt="Diagram: a transaction with multiple inputs and outputs." loading="lazy"></figure>
<p>It should be noted that fan-out, where a transaction depends on several transactions, and those transactions depend on many more, is not a problem here. There is never the need to extract a complete standalone copy of a transaction&#x27;s history.</p>
<h2 id="en-s10-privacy">10. Privacy</h2>
<p>The traditional banking model achieves a level of privacy by limiting access to information to the parties involved and the trusted third party. The necessity to announce all transactions publicly precludes this method, but privacy can still be maintained by breaking the flow of information in another place: by keeping public keys anonymous. The public can see that someone is sending an amount to someone else, but without information linking the transaction to anyone. This is similar to the level of information released by stock exchanges, where the time and size of individual trades, the &quot;tape&quot;, is made public, but without telling who the parties were.</p>
<figure class="wp-fig"><img src="figures/fig-7.png" alt="Diagram: the traditional privacy model compared with the new privacy model." loading="lazy"></figure>
<p>As an additional firewall, a new key pair should be used for each transaction to keep them from being linked to a common owner. Some linking is still unavoidable with multi-input transactions, which necessarily reveal that their inputs were owned by the same owner. The risk is that if the owner of a key is revealed, linking could reveal other transactions that belonged to the same owner.</p>
<h2 id="en-s11-calculations">11. Calculations</h2>
<p>We consider the scenario of an attacker trying to generate an alternate chain faster than the honest chain. Even if this is accomplished, it does not throw the system open to arbitrary changes, such as creating value out of thin air or taking money that never belonged to the attacker. Nodes are not going to accept an invalid transaction as payment, and honest nodes will never accept a block containing them. An attacker can only try to change one of his own transactions to take back money he recently spent.</p>
<p>The race between the honest chain and an attacker chain can be characterized as a Binomial Random Walk. The success event is the honest chain being extended by one block, increasing its lead by +1, and the failure event is the attacker&#x27;s chain being extended by one block, reducing the gap by -1.</p>
<p>The probability of an attacker catching up from a given deficit is analogous to a Gambler&#x27;s Ruin problem. Suppose a gambler with unlimited credit starts at a deficit and plays potentially an infinite number of trials to try to reach breakeven. We can calculate the probability he ever reaches breakeven, or that an attacker ever catches up with the honest chain, as follows [8]:</p>
<p><i>p</i> = probability an honest node finds the next block</p>
<p><i>q</i> = probability the attacker finds the next block</p>
<p><i>q<sub>z</sub></i> = probability the attacker will ever catch up from z blocks behind</p>
<math display="block"><msub><mi>q</mi><mi>z</mi></msub><mo>=</mo><mrow><mo>{</mo><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mtext>if&#160;</mtext><mi>p</mi><mo>&#8804;</mo><mi>q</mi></mtd></mtr><mtr><mtd><msup><mrow><mo>(</mo><mfrac><mi>q</mi><mi>p</mi></mfrac><mo>)</mo></mrow><mi>z</mi></msup></mtd><mtd><mtext>if&#160;</mtext><mi>p</mi><mo>&gt;</mo><mi>q</mi></mtd></mtr></mtable></mrow></math>
<p>Given our assumption that <i>p &gt; q</i>, the probability drops exponentially as the number of blocks the attacker has to catch up with increases. With the odds against him, if he doesn&#x27;t make a lucky lunge forward early on, his chances become vanishingly small as he falls further behind.</p>
<p>We now consider how long the recipient of a new transaction needs to wait before being sufficiently certain the sender can&#x27;t change the transaction. We assume the sender is an attacker who wants to make the recipient believe he paid him for a while, then switch it to pay back to himself after some time has passed. The receiver will be alerted when that happens, but the sender hopes it will be too late.</p>
<p>The receiver generates a new key pair and gives the public key to the sender shortly before signing. This prevents the sender from preparing a chain of blocks ahead of time by working on it continuously until he is lucky enough to get far enough ahead, then executing the transaction at that moment. Once the transaction is sent, the dishonest sender starts working in secret on a parallel chain containing an alternate version of his transaction.</p>
<p>The recipient waits until the transaction has been added to a block and <i>z</i> blocks have been linked after it. He doesn&#x27;t know the exact amount of progress the attacker has made, but assuming the honest blocks took the average expected time per block, the attacker&#x27;s potential progress will be a Poisson distribution with expected value:</p>
<math display="block"><mi>&#955;</mi><mo>=</mo><mi>z</mi><mfrac><mi>q</mi><mi>p</mi></mfrac></math>
<p>To get the probability the attacker could still catch up now, we multiply the Poisson density for each amount of progress he could have made by the probability he could catch up from that point:</p>
<math display="block"><munderover><mo>&#8721;</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mi>&#8734;</mi></munderover><mfrac><mrow><msup><mi>&#955;</mi><mi>k</mi></msup><msup><mi>e</mi><mrow><mo>&#8722;</mo><mi>&#955;</mi></mrow></msup></mrow><mrow><mi>k</mi><mo>!</mo></mrow></mfrac><mo>&#8901;</mo><mrow><mo>{</mo><mtable><mtr><mtd><msup><mrow><mo>(</mo><mfrac><mi>q</mi><mi>p</mi></mfrac><mo>)</mo></mrow><mrow><mo>(</mo><mi>z</mi><mo>&#8722;</mo><mi>k</mi><mo>)</mo></mrow></msup></mtd><mtd><mtext>if&#160;</mtext><mi>k</mi><mo>&#8804;</mo><mi>z</mi></mtd></mtr><mtr><mtd><mn>1</mn></mtd><mtd><mtext>if&#160;</mtext><mi>k</mi><mo>&gt;</mo><mi>z</mi></mtd></mtr></mtable></mrow></math>
<p>Rearranging to avoid summing the infinite tail of the distribution...</p>
<math display="block"><mn>1</mn><mo>&#8722;</mo><munderover><mo>&#8721;</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mi>z</mi></munderover><mfrac><mrow><msup><mi>&#955;</mi><mi>k</mi></msup><msup><mi>e</mi><mrow><mo>&#8722;</mo><mi>&#955;</mi></mrow></msup></mrow><mrow><mi>k</mi><mo>!</mo></mrow></mfrac><mrow><mo>(</mo><mn>1</mn><mo>&#8722;</mo><msup><mrow><mo>(</mo><mfrac><mi>q</mi><mi>p</mi></mfrac><mo>)</mo></mrow><mrow><mo>(</mo><mi>z</mi><mo>&#8722;</mo><mi>k</mi><mo>)</mo></mrow></msup><mo>)</mo></mrow></math>
<p>Converting to C code...</p>
<pre><code>#include &lt;math.h&gt;
double AttackerSuccessProbability(double q, int z)
{
    double p = 1.0 - q;
    double lambda = z * (q / p);
    double sum = 1.0;
    int i, k;
    for (k = 0; k &lt;= z; k++)
    {
        double poisson = exp(-lambda);
        for (i = 1; i &lt;= k; i++)
            poisson *= lambda / i;
        sum -= poisson * (1 - pow(q / p, z - k));
    }
    return sum;
}</code></pre>
<p>Running some results, we can see the probability drop off exponentially with z.</p>
<pre><code>q=0.1
z=0    P=1.0000000
z=1    P=0.2045873
z=2    P=0.0509779
z=3    P=0.0131722
z=4    P=0.0034552
z=5    P=0.0009137
z=6    P=0.0002428
z=7    P=0.0000647
z=8    P=0.0000173
z=9    P=0.0000046
z=10   P=0.0000012</code></pre>
<pre><code>q=0.3
z=0    P=1.0000000
z=5    P=0.1773523
z=10   P=0.0416605
z=15   P=0.0101008
z=20   P=0.0024804
z=25   P=0.0006132
z=30   P=0.0001522
z=35   P=0.0000379
z=40   P=0.0000095
z=45   P=0.0000024
z=50   P=0.0000006</code></pre>
<p>Solving for P less than 0.1%...</p>
<pre><code>P &lt; 0.001
q=0.10   z=5
q=0.15   z=8
q=0.20   z=11
q=0.25   z=15
q=0.30   z=24
q=0.35   z=41
q=0.40   z=89
q=0.45   z=340</code></pre>
<h2 id="en-s12-conclusion">12. Conclusion</h2>
<p>We have proposed a system for electronic transactions without relying on trust. We started with the usual framework of coins made from digital signatures, which provides strong control of ownership, but is incomplete without a way to prevent double-spending. To solve this, we proposed a peer-to-peer network using proof-of-work to record a public history of transactions that quickly becomes computationally impractical for an attacker to change if honest nodes control a majority of CPU power. The network is robust in its unstructured simplicity. Nodes work all at once with little coordination. They do not need to be identified, since messages are not routed to any particular place and only need to be delivered on a best effort basis. Nodes can leave and rejoin the network at will, accepting the proof-of-work chain as proof of what happened while they were gone. They vote with their CPU power, expressing their acceptance of valid blocks by working on extending them and rejecting invalid blocks by refusing to work on them. Any needed rules and incentives can be enforced with this consensus mechanism.</p>
<h2 id="en-references">References</h2><ol class="wp-refs">
<li>W. Dai, &quot;b-money,&quot; <a href="http://www.weidai.com/bmoney.txt">http://www.weidai.com/bmoney.txt</a>, 1998.</li>
<li>H. Massias, X.S. Avila, and J.-J. Quisquater, &quot;Design of a secure timestamping service with minimal trust requirements,&quot; In <i>20th Symposium on Information Theory in the Benelux</i>, May 1999.</li>
<li>S. Haber, W.S. Stornetta, &quot;How to time-stamp a digital document,&quot; In <i>Journal of Cryptology</i>, vol 3, no 2, pages 99-111, 1991.</li>
<li>D. Bayer, S. Haber, W.S. Stornetta, &quot;Improving the efficiency and reliability of digital time-stamping,&quot; In <i>Sequences II: Methods in Communication, Security and Computer Science</i>, pages 329-334, 1993.</li>
<li>S. Haber, W.S. Stornetta, &quot;Secure names for bit-strings,&quot; In <i>Proceedings of the 4th ACM Conference on Computer and Communications Security</i>, pages 28-35, April 1997.</li>
<li>A. Back, &quot;Hashcash - a denial of service counter-measure,&quot; <a href="http://www.hashcash.org/papers/hashcash.pdf">http://www.hashcash.org/papers/hashcash.pdf</a>, 2002.</li>
<li>R.C. Merkle, &quot;Protocols for public key cryptosystems,&quot; In <i>Proc. 1980 Symposium on Security and Privacy</i>, IEEE Computer Society, pages 122-133, April 1980.</li>
<li>W. Feller, &quot;An introduction to probability theory and its applications,&quot; 1957.</li>
</ol>
</div>
