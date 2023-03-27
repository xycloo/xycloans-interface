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
    <p>{item[0]}</p>
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

 table{
  width:100%;
  table-layout: fixed;
}
.tbl-header{
  background-color: rgba(0,0,0,0.3);
 }
.tbl-content{
  overflow-x:auto;
  margin-top: 0px;
  border: 3px solid rgba(0,0,0,0.3);
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
}
th{
  padding: 20px 15px;
  text-align: left;
  font-weight: 500;
  font-size: 12px;
  color: #fff;
  text-transform: uppercase;
}
td{
      background: #0d1016;
  padding: 15px;
  text-align: left;
  vertical-align:middle;
  font-weight: 300;
  font-size: 12px;
  color: #fff;
  border-bottom: solid 1px rgba(0,0,0,0.1);
}

 
 h2 {
     text-align: center;
 }

 .vault-list-item {
     text-align: center;
     padding: 20px;
     background: #000000;
     border-radius: 10px;
     width: 550px;
     margin: auto;
     margin-top: 60px;

 }
 
</style>
