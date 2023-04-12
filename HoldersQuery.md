### GraphQL queries for counting holders

**1. SFC Old and SFC 2 tokens**

>```
query SfcHoldersQuery {
  usersConnection(
  orderBy: id_ASC, 
  where: {
    id_not_eq: "0x0000000000000000000000000000000000000000", 
    sfcOld_gt: "0", 
    sfc2_gt: "0"
  }) {
    totalCount
  }
}
>```

**2. SFCR and SFCR 2 tokens**

>```
query SfcrHoldersQuery {
  usersConnection(
  orderBy: id_ASC, 
  where: {
    id_not_eq: "0x0000000000000000000000000000000000000000", 
    sfcr_gt: "0", 
    sfcr2_gt: "0"
  }) {
    totalCount
  }
}
>```