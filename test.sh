#! /bin/sh

yarn lint

npx truffle compile
npx truffle migrate --reset --network docker
npx truffle test --network docker
