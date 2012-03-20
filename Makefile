test:
	mocha \
		--reporter dot \
		--ui bdd \
		--require chai \
		--require ./Rytm \
		--growl

.PHONY: test