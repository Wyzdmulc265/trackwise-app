@description('The name of the PostgreSQL server')
param serverName string = 'trackwise-postgres-${uniqueString(resourceGroup().id)}'

@description('The location for the resource group')
param location string = resourceGroup().location

@description('Administrator login name for the server')
param administratorLogin string = 'trackwiseadmin'

@description('Administrator login password for the server')
@secure()
param administratorLoginPassword string

@description('PostgreSQL version')
param postgresqlVersion string = '15'

@description('SKU name for the server')
param skuName string = 'Standard_B1ms'

@description('Storage size in GB')
param storageSizeGB int = 32

@description('Backup retention days')
param backupRetentionDays int = 7

@description('High availability mode')
param highAvailabilityMode string = 'Disabled'

@description('Geo-redundant backup enabled')
param geoRedundantBackupEnabled bool = false

@description('Virtual network name')
param virtualNetworkName string

@description('Subnet name for PostgreSQL')
param subnetName string = 'postgresql-subnet'

@description('Database name')
param databaseName string = 'trackwise'

@description('Allow public access (for development only)')
param allowPublicAccess bool = false

resource virtualNetwork 'Microsoft.Network/virtualNetworks@2023-11-01' existing = {
  name: virtualNetworkName
}

resource subnet 'Microsoft.Network/virtualNetworks/subnets@2023-11-01' existing = {
  name: '${virtualNetworkName}/${subnetName}'
}

resource postgresqlServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  sku: {
    name: skuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    version: postgresqlVersion
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: geoRedundantBackupEnabled
    }
    highAvailability: {
      mode: highAvailabilityMode
    }
    network: allowPublicAccess ? {
      publicNetworkAccess: 'Enabled'
    } : {
      publicNetworkAccess: 'Disabled'
      delegatedSubnetResourceId: subnet.id
    }
    maintenanceWindow: {
      customWindow: 'Disabled'
      dayOfWeek: 0
      startHour: 0
      startMinute: 0
    }
  }
}

resource postgresqlDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  name: '${serverName}/${databaseName}'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
  dependsOn: [
    postgresqlServer
  ]
}

resource postgresqlFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = if (allowPublicAccess) {
  name: '${serverName}/AllowAllAzureIPs'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
  dependsOn: [
    postgresqlServer
  ]
}

output serverName string = postgresqlServer.name
output databaseName string = postgresqlDatabase.name
output serverFQDN string = postgresqlServer.properties.fullyQualifiedDomainName
output administratorLogin string = administratorLogin