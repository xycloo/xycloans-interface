<script>
export let data;
import SorobanClient from "soroban-client";

</script>

<svelte:head>
	<title>Xycloans</title>
	<meta name="description" content="xycloans lenders webapp" />
</svelte:head>

<section>

<!--    <h2>Explore XycLoans vaults</h2>-->
    <div class="tbl-header">
    <table cellpadding="0" cellspacing="0" border="0">
      <thead>
        <tr>
          <th>Id</th>
          <th>Asset</th>
        </tr>
      </thead>
    </table>
    </div>

    <div class="tbl-content">
    
    <table>

{#each data.vaults as item, i}
    <tr>
    <td>
    <a href="/vault/{item[0]}">
    {item[0]}
    </a>
    </td>
    <td>
    <p>{item[1]}</p>
        </td>
    
</tr>
{/each}

</table>
</div>
 
</section>

 <style>

 
</style>
