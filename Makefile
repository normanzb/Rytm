doc:
	groc "*.js" "README.md" --github false

.PHONY: doc

test:
	mocha \
		--reporter dot \
		--ui bdd \
		--require chai \
		--require ./Rytm \
		--growl

.PHONY: test