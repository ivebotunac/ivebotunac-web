<!-- One owner for the site-wide CSS: two SFCs importing the same src let one scope it. -->
<!-- Renders null, a comment on server and client alike: an empty <template> rendered nothing on the
     server and a comment on the client, and that mismatch remounted the whole layout. -->
<script lang="ts">
export default defineComponent({ render: () => null })
</script>

<style src="~/assets/css/tokens.css"></style>
<style src="~/assets/css/base.css"></style>
<style src="~/assets/css/components.css"></style>
<style src="~/assets/css/site.css"></style>
