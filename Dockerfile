FROM node:20-alpine
# Add a work directory
WORKDIR /app
# Cache and Install dependencies
COPY package.json .
COPY yarn.lock .
RUN yarn install
# Copy app files
COPY . .
RUN yarn build

# Expose port
EXPOSE 8080
# Start the app
CMD [ "yarn", "start" ]