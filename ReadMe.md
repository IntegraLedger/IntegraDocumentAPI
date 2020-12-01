[![Build Status](https://dev.azure.com/IntegraLedger/integraProductionAPI/_apis/build/status/IntegraProductionAPI%20-%20CI?branchName=production)](https://dev.azure.com/IntegraLedger/integraProductionAPI/_build/latest?definitionId=1&branchName=production)
docker build . -t integra.azurecr.io/integra-backend:v0.1
docker run -it --rm -p 3000:3000 integra.azurecr.io/integra-backend:v0.1

docker push integra.azurecr.io/integra-backend:v0.1

docker ps
docker kill [container_id]
