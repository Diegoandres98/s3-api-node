FROM node:14
#guardar mi codigo dentro de esta esta carpeta app
WORKDIR /app

#copio el packaje al interior
COPY package*.json ./

#Instalar dependencias
RUN npm install

#Me llevo el resto del codigo
COPY . .

#expongo en puerto 3000
EXPOSE 3000

CMD ["node", "--experimental-modules", "api.mjs"]