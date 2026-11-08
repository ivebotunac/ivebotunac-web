<!-- One owner for the site-wide CSS: two SFCs importing the same src let one scope it. -->
<!-- Renders null, a comment on server and client; an empty <template> mismatches on hydration. -->
<script lang="ts">
export default defineComponent({ render: () => null })
</script>

<style src="../../assets/css/tokens.css"></style>

<style src="../../assets/css/base.css"></style>

<style src="../../assets/css/components.css"></style>

<style src="../../assets/css/site.css"></style>
