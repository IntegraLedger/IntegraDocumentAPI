docker build . -t integra.azurecr.io/integra-backend:v0.1
docker run -it --rm -p 3000:3000 integra.azurecr.io/integra-backend:v0.1

docker push integra.azurecr.io/integra-backend:v0.1

docker ps
docker kill [container_id]