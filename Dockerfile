FROM node:9.8

RUN mkdir /app
WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

ADD . /app
RUN yarn
